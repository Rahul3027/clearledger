import { NextResponse } from "next/server";
import { withTenant, db } from "@/infrastructure/db/client";
import { canonicalTransactions } from "@/infrastructure/db/schema/ingestion";
import { reconciliationResults } from "@/infrastructure/db/schema/reconciliation";
import { exceptionCases, exceptionHistory } from "@/infrastructure/db/schema/workflow";
import { evidencePackages } from "@/infrastructure/db/schema/reporting";
import { auditOutbox } from "@/infrastructure/db/schema/audit";
import { AuditEncoder } from "@/domain/workflow/audit-encoder";
import { eq, and, sql, count } from "drizzle-orm";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const periodKey = url.searchParams.get("periodKey");
  
  const orgId = request.headers.get("x-org-id");
  const actorId = request.headers.get("x-user-id") || "SYSTEM_ADMIN";

  if (!orgId || !periodKey) {
    return NextResponse.json({ error: "Missing orgId or periodKey" }, { status: 400 });
  }

  try {
    return await withTenant(orgId, async (tx) => {

      // 1. Ingested Volume & DQE Reject Rate
      const txStats = await tx.select({
        total: count(canonicalTransactions.platformId),
        rejected: count(
          sql`CASE WHEN ${canonicalTransactions.dqAction} = 'REJECTED' THEN 1 END`
        )
      }).from(canonicalTransactions)
        .where(and(eq(canonicalTransactions.orgId, orgId), eq(canonicalTransactions.periodKey, periodKey)));

      const totalIngested = txStats[0].total;
      const totalRejected = txStats[0].rejected;
      const dqeRejectRate = totalIngested > 0 ? (totalRejected / totalIngested) * 100 : 0;

      // 2. Reconciliation Stats (Match Rate, Auto vs Manual)
      const reconStats = await tx.select({
        total: count(reconciliationResults.id),
        manualMatches: count(
          sql`CASE WHEN ${reconciliationResults.strategyUsed} = 'MANUAL' THEN 1 END`
        )
      }).from(reconciliationResults)
        .where(and(eq(reconciliationResults.orgId, orgId), eq(reconciliationResults.periodKey, periodKey)));
      
      const totalMatches = reconStats[0].total;
      const manualMatches = reconStats[0].manualMatches;
      const matchRate = (totalIngested - totalRejected) > 0 ? (totalMatches / (totalIngested - totalRejected)) * 100 : 0;
      const autoMatchRatio = totalMatches > 0 ? ((totalMatches - manualMatches) / totalMatches) * 100 : 0;

      // 3. Workflow SLA Stats
      // Note: We join with canonicalTransactions to filter by periodKey
      const workflowStats = await tx.select({
        totalCases: count(exceptionCases.id),
        breachedCases: count(
          sql`CASE WHEN ${exceptionCases.resolvedAt} > ${exceptionCases.slaTargetAt} OR (${exceptionCases.resolvedAt} IS NULL AND NOW() > ${exceptionCases.slaTargetAt}) THEN 1 END`
        ),
        avgResolutionMs: sql`AVG(EXTRACT(EPOCH FROM (${exceptionCases.resolvedAt} - ${exceptionCases.createdAt})))`
      }).from(exceptionCases)
        .leftJoin(canonicalTransactions, eq(exceptionCases.sourcePlatformId, canonicalTransactions.platformId))
        .where(and(eq(exceptionCases.orgId, orgId), eq(canonicalTransactions.periodKey, periodKey)));

      const slaBreachRate = workflowStats[0].totalCases > 0 ? (workflowStats[0].breachedCases / workflowStats[0].totalCases) * 100 : 0;
      const avgResolutionMs = Number(workflowStats[0].avgResolutionMs) || 0;
      const averageResolutionHours = avgResolutionMs / 3600;

      // 4. Manual Override Count (History checking for manual edits or matching)
      // For V1 we proxy this simply to manual recon matches + manual workflow resolutions.
      const manualOverrideCount = manualMatches + workflowStats[0].totalCases;

      // 5. Evidence Package Count
      const pkgStats = await tx.select({
        total: count(evidencePackages.id)
      }).from(evidencePackages)
        .where(and(eq(evidencePackages.orgId, orgId), eq(evidencePackages.periodKey, periodKey)));
      const evidencePackageCount = pkgStats[0].total;

      // 6. Global Audit Emit
      const outboxEvent = AuditEncoder.encodeEvent(
        orgId, actorId, "REPORT_GENERATED" as any, "dashboard-metrics", 
        undefined, 
        { periodKey, reportType: "DASHBOARD" }
      );
      await tx.insert(auditOutbox).values(outboxEvent);

      return NextResponse.json({
        data: {
          totalIngestedVolume: totalIngested,
          dqeRejectRate,
          matchRate,
          autoMatchRatio,
          manualOverrideCount,
          evidencePackageCount,
          slaBreachRate,
          averageResolutionHours
        }
      });
    });
  } catch (error) {
    console.error("Dashboard Metrics Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
