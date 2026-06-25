/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Upload, AlertTriangle, FileCheck, CheckCircle2, ShieldCheck, Clock, Download, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";

import { getAuthenticatedTenant } from "@/lib/auth/get-authenticated-tenant";
import { withTenant } from "@/infrastructure/db/client";
import { 
  reconciliationRuns, 
  reconciliationResults, 
  exceptionCases, 
  extractionJobs,
  canonicalTransactions,
  evidencePackages,
  entities
} from "@/infrastructure/db/schema";
import { count, eq, desc, and, gte, or } from "drizzle-orm";

export default async function DashboardOverviewPage() {
  const { orgId, entityId } = await getAuthenticatedTenant();
  const cookieStore = cookies();
  const periodKey = cookieStore.get("selected_tax_period")?.value || "2026-06";

  // Data states
  let activeEntity: any = null;
  let uploadsToday = 0;
  let validationErrorsCount = 0;
  let invoicesAwaitingMatch = 0;
  let vatVariance = 0;
  let highRiskIssuesCount = 0;
  
  let recentUploadsList: any[] = [];
  let recentValidationFailures: any[] = [];
  let recentReconRuns: any[] = [];
  let recentVATIssues: any[] = [];
  let recentEvidencePkgs: any[] = [];

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    await withTenant(orgId, async (tx) => {
      // Fetch active entity info
      if (entityId) {
        const entRes = await tx.select().from(entities).where(eq(entities.id, entityId)).limit(1);
        if (entRes.length > 0) activeEntity = entRes[0];
      }

      // 1. Today's Uploads (Extraction jobs starting today)
      const uploads = await tx
        .select({ value: count() })
        .from(extractionJobs)
        .where(
          and(
            eq(extractionJobs.orgId, orgId),
            entityId ? eq(extractionJobs.entityId, entityId) : undefined,
            gte(extractionJobs.createdAt, startOfDay)
          )
        );
      uploadsToday = uploads[0]?.value || 0;

      // 2. Validation Errors Count (Quarantined or rejected canonical transactions)
      const validations = await tx
        .select({ value: count() })
        .from(canonicalTransactions)
        .where(
          and(
            eq(canonicalTransactions.orgId, orgId),
            entityId ? eq(canonicalTransactions.entityId, entityId) : undefined,
            eq(canonicalTransactions.periodKey, periodKey),
            or(
              eq(canonicalTransactions.dqAction, "QUARANTINED"),
              eq(canonicalTransactions.dqAction, "REJECTED")
            )
          )
        );
      validationErrorsCount = validations[0]?.value || 0;

      // 3. Invoices Awaiting Match (Open exceptions)
      const unmatched = await tx
        .select({ value: count() })
        .from(exceptionCases)
        .where(
          and(
            eq(exceptionCases.orgId, orgId),
            eq(exceptionCases.status, "OPEN")
          )
        );
      invoicesAwaitingMatch = unmatched[0]?.value || 0;

      // 4. VAT Variance Sum
      const varianceRows = await tx
        .select({ amountVariance: reconciliationResults.amountVariance })
        .from(reconciliationResults)
        .where(
          and(
            eq(reconciliationResults.orgId, orgId),
            eq(reconciliationResults.periodKey, periodKey)
          )
        );
      vatVariance = varianceRows.reduce((acc, r) => acc + Number(r.amountVariance || 0), 0);

      // 5. High-Risk Exceptions (Critical / High priority open issues)
      const highRisk = await tx
        .select({ value: count() })
        .from(exceptionCases)
        .where(
          and(
            eq(exceptionCases.orgId, orgId),
            eq(exceptionCases.status, "OPEN"),
            or(
              eq(exceptionCases.priority, "CRITICAL"),
              eq(exceptionCases.priority, "HIGH")
            )
          )
        );
      highRiskIssuesCount = highRisk[0]?.value || 0;

      // Table Queries
      recentUploadsList = await tx
        .select()
        .from(extractionJobs)
        .where(eq(extractionJobs.orgId, orgId))
        .orderBy(desc(extractionJobs.createdAt))
        .limit(5);

      recentValidationFailures = await tx
        .select()
        .from(canonicalTransactions)
        .where(
          and(
            eq(canonicalTransactions.orgId, orgId),
            or(
              eq(canonicalTransactions.dqAction, "QUARANTINED"),
              eq(canonicalTransactions.dqAction, "REJECTED")
            )
          )
        )
        .orderBy(desc(canonicalTransactions.ingestedAt))
        .limit(5);

      recentReconRuns = await tx
        .select()
        .from(reconciliationRuns)
        .where(eq(reconciliationRuns.orgId, orgId))
        .orderBy(desc(reconciliationRuns.startedAt))
        .limit(5);

      recentVATIssues = await tx
        .select()
        .from(exceptionCases)
        .where(eq(exceptionCases.orgId, orgId))
        .orderBy(desc(exceptionCases.createdAt))
        .limit(5);

      recentEvidencePkgs = await tx
        .select()
        .from(evidencePackages)
        .where(eq(evidencePackages.orgId, orgId))
        .orderBy(desc(evidencePackages.createdAt))
        .limit(5);
    });
  } catch (err) {
    console.error("Dashboard database queries failed:", err);
  }

  // Calculate filing deadline based on active entity
  const country = activeEntity?.countryCode || "GB";
  const deadlineDate = country === "GB" ? "July 07, 2026" : "July 10, 2026";
  const returnsReadyStatus = invoicesAwaitingMatch === 0 && validationErrorsCount === 0 ? "Filing Ready" : "Review Required";

  return (
    <div className="space-y-6 flex flex-col h-full text-slate-900 font-sans">
      
      <PageHeader 
        title="VAT Reconciliation Workspace" 
        description={`Filing period closed review for ${activeEntity?.legalName || "Active Entity"}.`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="border-slate-200 text-xs h-8 bg-white font-medium hover:bg-slate-50">
              <Clock className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              Filing Due: {deadlineDate}
            </Button>
            <Button variant="outline" className="border-slate-200 text-xs h-8 bg-white font-medium hover:bg-slate-50">
              <Download className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              Export Summary
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard 
          title="Today's Uploads" 
          value={uploadsToday} 
          description="Ingestion runs processed" 
          className="border-slate-200 bg-white"
        />
        <StatCard 
          title="Validation Errors" 
          value={validationErrorsCount} 
          description="Quarantined records" 
          className={validationErrorsCount > 0 ? "border-amber-200 bg-amber-50/20" : "border-slate-200 bg-white"}
        />
        <StatCard 
          title="Invoices Awaiting Match" 
          value={invoicesAwaitingMatch} 
          description="Transactions to reconcile" 
          className="border-slate-200 bg-white"
        />
        <StatCard 
          title="VAT Variance" 
          value={`£${vatVariance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          description="Variance on current period" 
          className="border-slate-200 bg-white"
        />
        <StatCard 
          title="Returns Ready" 
          value={returnsReadyStatus} 
          description={invoicesAwaitingMatch > 0 ? `${invoicesAwaitingMatch} blockers remaining` : "Ready to file"} 
          className={returnsReadyStatus === "Filing Ready" ? "border-emerald-200 bg-emerald-50/20" : "border-slate-200 bg-white"}
        />
        <StatCard 
          title="High-Risk Exceptions" 
          value={highRiskIssuesCount} 
          description="Critical priority issues" 
          className={highRiskIssuesCount > 0 ? "border-red-200 bg-red-50/20" : "border-slate-200 bg-white"}
        />
      </div>

      {/* Grid of dense operational tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Uploads */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
              <Upload className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              Recent Uploads
            </h3>
            <Link href="/ingestion" className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center">
              Uploads Center <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
          <div className="flex-1 overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-2">Job ID</th>
                  <th className="py-2">Connector</th>
                  <th className="py-2 text-right">Extracted / Mapped</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {recentUploadsList.length > 0 ? recentUploadsList.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/50">
                    <td className="py-2 text-slate-500 font-mono">{job.id.substring(0, 8)}</td>
                    <td className="py-2 text-slate-800">Excel Ingestion</td>
                    <td className="py-2 text-right text-slate-600">{job.rowsExtracted} / {job.rowsMapped}</td>
                    <td className="py-2 text-right">
                      <StatusBadge variant={job.status === "COMPLETED" ? "success" : job.status === "FAILED" ? "destructive" : "warning"}>
                        {job.status}
                      </StatusBadge>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400">No recent uploads</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Validation Failures */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              Recent Validation Failures
            </h3>
            <Link href="/ingestion/validation" className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center">
              Validation Workspace <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
          <div className="flex-1 overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-2">Invoice No</th>
                  <th className="py-2">Counterparty</th>
                  <th className="py-2 text-right">VAT Amount</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {recentValidationFailures.length > 0 ? recentValidationFailures.map((tx) => (
                  <tr key={tx.platformId} className="hover:bg-slate-50/50">
                    <td className="py-2 text-slate-800 font-mono">{tx.docNumber}</td>
                    <td className="py-2 text-slate-700 truncate max-w-[150px]">{tx.counterpartyName || "Unknown"}</td>
                    <td className="py-2 text-right text-slate-900">£{Number(tx.taxAmount || 0).toFixed(2)}</td>
                    <td className="py-2 text-right">
                      <StatusBadge variant="destructive">{tx.dqAction}</StatusBadge>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400">No recent validation failures</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reconciliation Runs */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
              <FileCheck className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              Recent Reconciliation Runs
            </h3>
            <Link href="/reconciliation" className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center">
              Recon Workspace <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
          <div className="flex-1 overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-2">Run ID</th>
                  <th className="py-2">Period</th>
                  <th className="py-2 text-right">Processed Records</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {recentReconRuns.length > 0 ? recentReconRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-50/50">
                    <td className="py-2 text-slate-500 font-mono">{run.id.substring(0, 8)}</td>
                    <td className="py-2 text-slate-800">{run.periodKey}</td>
                    <td className="py-2 text-right text-slate-600">{run.recordsProcessed}</td>
                    <td className="py-2 text-right">
                      <StatusBadge variant={run.status === "COMPLETED" ? "success" : run.status === "FAILED" ? "destructive" : "warning"}>
                        {run.status}
                      </StatusBadge>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400">No reconciliation runs executed</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* VAT Issues */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              Recent VAT Issues
            </h3>
            <Link href="/exceptions" className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center">
              Exceptions Log <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
          <div className="flex-1 overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-2">Issue ID</th>
                  <th className="py-2">Priority</th>
                  <th className="py-2">Assigned To</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {recentVATIssues.length > 0 ? recentVATIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-50/50">
                    <td className="py-2 text-slate-500 font-mono">{issue.id.substring(0, 8)}</td>
                    <td className="py-2">
                      <StatusBadge variant={issue.priority === "CRITICAL" || issue.priority === "HIGH" ? "destructive" : "warning"}>
                        {issue.priority}
                      </StatusBadge>
                    </td>
                    <td className="py-2 text-slate-700">{issue.assignedTo || "Unassigned"}</td>
                    <td className="py-2 text-right">
                      <StatusBadge variant={issue.status === "RESOLVED" ? "success" : "warning"}>
                        {issue.status}
                      </StatusBadge>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400">No open VAT issues</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
              <Clock className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              Filing Deadlines & Compliance Status
            </h3>
            <Link href="/compliance" className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center">
              Filing Center <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
          <div className="flex-1 overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-2">Reporting Period</th>
                  <th className="py-2">Jurisdiction</th>
                  <th className="py-2">Deadline</th>
                  <th className="py-2 text-right">Action Needed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2 text-slate-800 font-semibold">{periodKey}</td>
                  <td className="py-2 text-slate-600">{country} VAT Return</td>
                  <td className="py-2 text-slate-800">{deadlineDate}</td>
                  <td className="py-2 text-right">
                    <span className="text-amber-600 font-semibold">{returnsReadyStatus}</span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 text-slate-400">
                  <td className="py-2">2026-07</td>
                  <td className="py-2">{country} VAT Return</td>
                  <td className="py-2">August 07, 2026</td>
                  <td className="py-2 text-right">Future Period</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Evidence Packages */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              Recent Evidence Packages
            </h3>
            <Link href="/compliance" className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center">
              Evidence Library <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
          <div className="flex-1 overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-2">Package ID</th>
                  <th className="py-2">Tax Period</th>
                  <th className="py-2">Created At</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {recentEvidencePkgs.length > 0 ? recentEvidencePkgs.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50/50">
                    <td className="py-2 text-slate-500 font-mono">{pkg.id.substring(0, 8)}</td>
                    <td className="py-2 text-slate-800">{pkg.periodKey}</td>
                    <td className="py-2 text-slate-600">{new Date(pkg.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 text-right">
                      <StatusBadge variant={pkg.status === "READY" ? "success" : pkg.status === "FAILED" ? "destructive" : "warning"}>
                        {pkg.status}
                      </StatusBadge>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400">No evidence packages generated yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}

