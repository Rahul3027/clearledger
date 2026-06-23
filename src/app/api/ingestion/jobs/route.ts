import { NextResponse } from "next/server";
import { db } from "@/infrastructure/db/client";
import { extractionJobs, canonicalTransactions, connectors } from "@/infrastructure/db/schema/ingestion";
import { auditOutbox } from "@/infrastructure/db/schema/audit";
import { getStorageAdapter } from "@/infrastructure/storage/supabase-storage-adapter";
import { ConnectorRegistry } from "@/domain/ingestion/registry";
import { ExtractionJob, ConnectorError } from "@/domain/ingestion/types";
import { eq, sql } from "drizzle-orm";
import { createHash } from "crypto";

export async function POST(request: Request) {
  const orgId = request.headers.get("x-org-id");
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { dbConnectorId, filePaths, jobConfig } = body;

    if (!dbConnectorId) {
      return NextResponse.json({ error: "Missing dbConnectorId" }, { status: 400 });
    }

    // 1. Transaction to fetch connector and create job
    const setupResult = await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.current_org_id = ${orgId}`);

      const dbConnector = await tx.query.connectors.findFirst({
        where: eq(connectors.id, dbConnectorId),
      });

      if (!dbConnector) {
        throw new Error("Connector not found in database");
      }

      // Create Extraction Job in DB
      const [jobRecord] = await tx.insert(extractionJobs).values({
        orgId,
        entityId: dbConnector.entityId,
        connectorId: dbConnector.id,
        status: "RUNNING",
        startedAt: new Date(),
      }).returning();

      return { jobRecord, dbConnector };
    });

    const { jobRecord, dbConnector } = setupResult;

    // 2. Initialize Adapter
    const storage = getStorageAdapter();
    const registry = ConnectorRegistry.getInstance(storage);
    const adapter = registry.getConnector(dbConnector.slug);

    if (!adapter) {
      await markJobFailed(jobRecord.id, orgId, "Adapter implementation not found for slug: " + dbConnector.slug);
      return NextResponse.json({ error: "Adapter implementation not found" }, { status: 500 });
    }

    // 3. Execution (Extract & Transform)
    const extractionJobContext: ExtractionJob = {
      jobId: jobRecord.id,
      connectorId: dbConnector.slug,
      orgId,
      entityId: dbConnector.entityId,
      config: { ...((dbConnector.config as Record<string, any>) || {}), ...(jobConfig || {}) },
      filePaths,
    };

    try {
      const extractionResult = await adapter.extract(extractionJobContext);
      
      if (extractionResult.rawRecords.length === 0) {
        // Complete early
        await finishJob(jobRecord.id, orgId, 0, 0, 0, 0, null, new Date());
        return NextResponse.json({ status: "COMPLETED", rowsExtracted: 0 });
      }

      const transformResult = await adapter.transform(extractionResult.rawRecords, extractionJobContext);

      // 4. Normalize & DQE Evaluation & Insert Canonical Transactions
      if (transformResult.canonicalTransactions.length > 0) {
        const { Normalizer } = await import("@/domain/normalization/normalizer");
        const { DqeEngine } = await import("@/domain/dqe/engine");
        const { DEFAULT_DQE_CONFIG } = await import("@/domain/dqe/config");
        const { dqResults } = await import("@/infrastructure/db/schema/dqe");
        
        const normalizer = new Normalizer();
        const dqe = new DqeEngine(DEFAULT_DQE_CONFIG);

        await db.transaction(async (tx) => {
          await tx.execute(sql`SET LOCAL app.current_org_id = ${orgId}`);

          const recordsToInsert = [];
          const dqeEvaluations = [];
          let admittedCount = 0;
          let quarantinedCount = 0;
          let rejectedCount = 0;

          for (const t of transformResult.canonicalTransactions) {
            // Document Identity Strategy fallback
            let stableIdentityKey = t.stableIdentityKey;
            if (!stableIdentityKey) {
              if (t.sourceRecordId) {
                stableIdentityKey = createHash("sha256").update(`${t.sourceConnectorId}:${t.sourceRecordId}`).digest("hex");
              } else {
                stableIdentityKey = createHash("sha256").update(`${t.docNumber}|${t.docDate?.toISOString()}|${t.currencyCode}|${t.grossAmount}|${t.counterpartyTaxId || ''}`).digest("hex");
              }
            }
            
            // Phase 2: Normalization
            const normResult = normalizer.normalize(t);
            const normalizedTx = normResult.transaction;
            normalizedTx.stableIdentityKey = stableIdentityKey; // Keep identity intact

            // Phase 2: DQE Evaluation
            const dqeResult = dqe.evaluate(normalizedTx);
            
            // Statistics
            if (dqeResult.action.startsWith("ADMITTED")) admittedCount++;
            else if (dqeResult.action === "QUARANTINED") quarantinedCount++;
            else if (dqeResult.action === "REJECTED") rejectedCount++;

            recordsToInsert.push({
              orgId,
              entityId: dbConnector.entityId,
              stableIdentityKey,
              sourceConnectorId: normalizedTx.sourceConnectorId,
              sourceRecordId: normalizedTx.sourceRecordId,
              domainId: normalizedTx.domainId,
              datasetLabel: normalizedTx.datasetLabel,
              docType: normalizedTx.docType,
              docNumber: normalizedTx.docNumber,
              docDate: normalizedTx.docDate.toISOString(),
              periodKey: normalizedTx.periodKey || "UNKNOWN",
              counterpartyName: normalizedTx.counterpartyName,
              counterpartyTaxId: normalizedTx.counterpartyTaxId,
              counterpartyId: normalizedTx.counterpartyId,
              currencyCode: normalizedTx.currencyCode,
              exchangeRate: normalizedTx.exchangeRate.toString(),
              netAmount: normalizedTx.netAmount.toString(),
              taxAmount: normalizedTx.taxAmount ? normalizedTx.taxAmount.toString() : null,
              grossAmount: normalizedTx.grossAmount.toString(),
              baseNetAmount: normalizedTx.baseNetAmount !== undefined ? normalizedTx.baseNetAmount.toString() : (normalizedTx.netAmount * normalizedTx.exchangeRate).toString(),
              baseTaxAmount: normalizedTx.baseTaxAmount !== undefined ? normalizedTx.baseTaxAmount.toString() : (normalizedTx.taxAmount ? (normalizedTx.taxAmount * normalizedTx.exchangeRate).toString() : null),
              baseGrossAmount: normalizedTx.baseGrossAmount !== undefined ? normalizedTx.baseGrossAmount.toString() : (normalizedTx.grossAmount * normalizedTx.exchangeRate).toString(),
              accountCode: normalizedTx.accountCode,
              costCentre: normalizedTx.costCentre,
              referenceDocNumber: normalizedTx.referenceDocNumber,
              lineItems: normalizedTx.lineItems,
              customFields: normalizedTx.customFields,
              ingestedBy: "api-job",
              dqAction: dqeResult.action,
              normalizationWarnings: normResult.warnings.length > 0 ? normResult.warnings : null,
            });
            
            dqeEvaluations.push({
              stableIdentityKey,
              evalResult: dqeResult
            });
          }

          // Insert Canonical Transactions in chunks
          const CHUNK_SIZE = 500;
          const insertedPlatformIds = new Map<string, string>(); // mapping stableIdentityKey -> platformId
          
          for (let i = 0; i < recordsToInsert.length; i += CHUNK_SIZE) {
            const chunk = recordsToInsert.slice(i, i + CHUNK_SIZE);
            const result = await tx.insert(canonicalTransactions)
                                   .values(chunk)
                                   .onConflictDoNothing({ target: [canonicalTransactions.stableIdentityKey] })
                                   .returning({ platformId: canonicalTransactions.platformId, stableIdentityKey: canonicalTransactions.stableIdentityKey });
            for (const row of result) {
              insertedPlatformIds.set(row.stableIdentityKey, row.platformId);
            }
          }

          // Phase 2: Insert DQ Results for the newly inserted records
          const dqResultsToInsert = dqeEvaluations
            .filter(e => insertedPlatformIds.has(e.stableIdentityKey))
            .map(e => ({
              orgId,
              platformId: insertedPlatformIds.get(e.stableIdentityKey)!,
              score: e.evalResult.score.toString(),
              action: e.evalResult.action,
              rulesEvaluated: e.evalResult.rulesEvaluated,
              engineVersion: e.evalResult.engineVersion
            }));

          if (dqResultsToInsert.length > 0) {
            for (let i = 0; i < dqResultsToInsert.length; i += CHUNK_SIZE) {
               const chunk = dqResultsToInsert.slice(i, i + CHUNK_SIZE);
               await tx.insert(dqResults).values(chunk);
            }
          }

          // Generate Audit Event for the successful ingestion
          await tx.insert(auditOutbox).values({
            orgId,
            entityId: dbConnector.entityId,
            actorId: "SYSTEM",
            actorType: "SYSTEM",
            eventType: "INGESTION_COMPLETED",
            resourceType: "EXTRACTION_JOB",
            resourceId: jobRecord.id,
            afterState: { rowsMapped: transformResult.canonicalTransactions.length },
          });
        });
      }

      // 5. Wrap up
      await finishJob(
        jobRecord.id, 
        orgId,
        extractionResult.rawRecords.length,
        transformResult.canonicalTransactions.length,
        transformResult.quarantinedRecords.length,
        transformResult.rejectedRecords.length,
        transformResult.errors.length > 0 ? { errors: transformResult.errors } : null,
        new Date()
      );

      await adapter.report({
        jobId: jobRecord.id,
        connectorId: dbConnector.slug,
        startedAt: jobRecord.startedAt!,
        completedAt: new Date(),
        rowsExtracted: extractionResult.rawRecords.length,
        rowsMapped: transformResult.canonicalTransactions.length,
        rowsQuarantined: transformResult.quarantinedRecords.length,
        rowsRejected: transformResult.rejectedRecords.length,
        errors: transformResult.errors,
        warnings: extractionResult.warnings || [],
      });

      return NextResponse.json({ 
        status: "COMPLETED", 
        rowsExtracted: extractionResult.rawRecords.length,
        rowsMapped: transformResult.canonicalTransactions.length
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await markJobFailed(jobRecord.id, orgId, errorMsg);
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
  } catch (error) {
    console.error("Ingestion Job Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function markJobFailed(jobId: string, orgId: string, errorDetail: string) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.current_org_id = ${orgId}`);
    await tx.update(extractionJobs)
      .set({ 
        status: "FAILED", 
        errorDetails: { message: errorDetail },
        completedAt: new Date()
      })
      .where(eq(extractionJobs.id, jobId));
  });
}

async function finishJob(
  jobId: string, orgId: string, extracted: number, mapped: number, 
  quarantined: number, rejected: number, errorDetails: any, completedAt: Date
) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.current_org_id = ${orgId}`);
    await tx.update(extractionJobs)
      .set({ 
        status: "COMPLETED", 
        rowsExtracted: extracted,
        rowsMapped: mapped,
        rowsQuarantined: quarantined,
        rowsRejected: rejected,
        errorDetails,
        completedAt
      })
      .where(eq(extractionJobs.id, jobId));
  });
}
