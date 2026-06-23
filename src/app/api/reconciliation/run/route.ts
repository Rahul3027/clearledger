import { NextResponse } from "next/server";
import { db } from "@/infrastructure/db/client";
import { canonicalTransactions } from "@/infrastructure/db/schema/ingestion";
import { reconciliationRuns, reconciliationResults } from "@/infrastructure/db/schema/reconciliation";
import { auditOutbox } from "@/infrastructure/db/schema/audit";
import { and, eq, inArray, sql } from "drizzle-orm";
import { ReconciliationEngine } from "@/domain/reconciliation/engine";
import { DEFAULT_RECONCILIATION_CONFIG } from "@/domain/reconciliation/config";
import { CanonicalTransactionInput } from "@/domain/ingestion/types";

export async function POST(request: Request) {
  const orgId = request.headers.get("x-org-id");
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = request.headers.get("x-user-id") || "SYSTEM_ADMIN";

  try {
    const body = await request.json();
    const { periodKey, sourceDomainId, targetDomainId } = body;

    if (!periodKey || !sourceDomainId || !targetDomainId) {
      return NextResponse.json({ error: "Missing required fields: periodKey, sourceDomainId, targetDomainId" }, { status: 400 });
    }

    // 1. Initialize Run and emit START audit event
    const runRecord = await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.current_org_id = ${orgId}`);
      
      const [run] = await tx.insert(reconciliationRuns).values({
        orgId,
        periodKey,
        initiatedBy: userId,
        status: "IN_PROGRESS"
      }).returning();

      await tx.insert(auditOutbox).values({
        orgId,
        actorId: userId,
        actorType: "USER",
        eventType: "RECONCILIATION_RUN_STARTED",
        resourceType: "RECONCILIATION_RUN",
        resourceId: run.id,
        afterState: { periodKey, sourceDomainId, targetDomainId },
      });

      return run;
    });

    try {
      // 2. Fetch Data Pools (Only ADMITTED or ADMITTED_WITH_WARNING)
      // Note: We bypass RLS manually in this block since we handle it at the query level or wrap it in a transaction
      // Actually, we should wrap the whole read/write in one massive transaction or segmented.
      // We will do segmented for safety.
      const fetchRecords = async (domainId: string) => {
        return await db.transaction(async (tx) => {
          await tx.execute(sql`SET LOCAL app.current_org_id = ${orgId}`);
          return tx.query.canonicalTransactions.findMany({
            where: and(
              eq(canonicalTransactions.periodKey, periodKey),
              eq(canonicalTransactions.domainId, domainId),
              inArray(canonicalTransactions.dqAction, ["ADMITTED", "ADMITTED_WITH_WARNING"])
            )
          });
        });
      };

      const sourceRecordsDb = await fetchRecords(sourceDomainId);
      const targetRecordsDb = await fetchRecords(targetDomainId);

      // Convert from DB format to Domain format (Date typing)
      const parseDbTx = (tx: any): CanonicalTransactionInput => ({
        ...tx,
        docDate: new Date(tx.docDate),
        netAmount: Number(tx.netAmount),
        taxAmount: tx.taxAmount ? Number(tx.taxAmount) : null,
        grossAmount: Number(tx.grossAmount),
        exchangeRate: Number(tx.exchangeRate),
        baseNetAmount: Number(tx.baseNetAmount),
        baseTaxAmount: tx.baseTaxAmount ? Number(tx.baseTaxAmount) : null,
        baseGrossAmount: Number(tx.baseGrossAmount)
      });

      const sourcePool = sourceRecordsDb.map(parseDbTx);
      const targetPool = targetRecordsDb.map(parseDbTx);

      // 3. Run Matching Engine
      const engine = new ReconciliationEngine(DEFAULT_RECONCILIATION_CONFIG);
      const results = engine.runReconciliation(sourcePool, targetPool);

      // 4. Save Results and emit COMPLETED audit event
      await db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL app.current_org_id = ${orgId}`);

        const resultsToInsert = results.map(r => ({
          orgId,
          runId: runRecord.id,
          periodKey,
          sourcePlatformId: r.sourceTx.platformId!,
          targetPlatformId: r.targetTx?.platformId || null,
          matchStatus: r.status,
          strategyUsed: r.strategyUsed || null,
          confidenceScore: r.confidenceScore.toString(),
          amountVariance: r.amountVariance.toString(),
          evidenceTrail: r.evidenceTrail
        }));

        // Insert in chunks to avoid query limits
        const CHUNK_SIZE = 500;
        for (let i = 0; i < resultsToInsert.length; i += CHUNK_SIZE) {
          const chunk = resultsToInsert.slice(i, i + CHUNK_SIZE);
          await tx.insert(reconciliationResults)
                  .values(chunk)
                  // If we run multiple times for a period, we UPSERT based on source unique constraint
                  // wait, we defined unique("reconciliation_source_idx").on(periodKey, sourcePlatformId)
                  .onConflictDoUpdate({
                    target: [reconciliationResults.periodKey, reconciliationResults.sourcePlatformId],
                    set: {
                      targetPlatformId: sql`EXCLUDED.target_platform_id`,
                      matchStatus: sql`EXCLUDED.match_status`,
                      strategyUsed: sql`EXCLUDED.strategy_used`,
                      confidenceScore: sql`EXCLUDED.confidence_score`,
                      amountVariance: sql`EXCLUDED.amount_variance`,
                      evidenceTrail: sql`EXCLUDED.evidence_trail`,
                      runId: sql`EXCLUDED.run_id`
                    }
                  });
        }

        // Update Run Record
        await tx.update(reconciliationRuns).set({
          status: "COMPLETED",
          completedAt: new Date(),
          recordsProcessed: sourcePool.length
        }).where(eq(reconciliationRuns.id, runRecord.id));

        // Generate immutable Audit Event
        await tx.insert(auditOutbox).values({
          orgId,
          actorId: "SYSTEM",
          actorType: "SYSTEM",
          eventType: "RECONCILIATION_RUN_COMPLETED",
          resourceType: "RECONCILIATION_RUN",
          resourceId: runRecord.id,
          afterState: { recordsProcessed: sourcePool.length, pairsMatched: results.filter(r => r.status.startsWith("MATCHED")).length },
        });
      });

      return NextResponse.json({ 
        status: "COMPLETED", 
        runId: runRecord.id,
        recordsProcessed: sourcePool.length 
      });

    } catch (engineError) {
      // Mark run as failed
      await db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL app.current_org_id = ${orgId}`);
        await tx.update(reconciliationRuns).set({
          status: "FAILED",
          completedAt: new Date(),
        }).where(eq(reconciliationRuns.id, runRecord.id));
      });

      throw engineError; // Bubble up
    }

  } catch (error) {
    console.error("Reconciliation Run Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
