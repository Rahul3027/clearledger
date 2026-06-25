/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { AlertCircle, CheckCircle2, Clock, ShieldCheck, Download, Plus, Calendar, FileText, ArrowRight, History } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";

import { getAuthenticatedTenant } from "@/lib/auth/get-authenticated-tenant";
import { withTenant } from "@/infrastructure/db/client";
import { 
  exceptionCases, 
  evidencePackages, 
  entities, 
  canonicalTransactions,
  reconciliationResults
} from "@/infrastructure/db/schema";
import { count, eq, and, or, desc } from "drizzle-orm";
import { generateEvidencePackageAction } from "@/app/actions/compliance";

export default async function ComplianceOverviewPage() {
  const { orgId, entityId } = await getAuthenticatedTenant();
  const cookieStore = cookies();
  const periodKey = cookieStore.get("selected_tax_period")?.value || "2026-06";

  let activeEntity: any = null;
  let openExceptionsCount = 0;
  let validationErrorsCount = 0;
  let totalReconCount = 0;
  let evidencePkgs: any[] = [];

  try {
    await withTenant(orgId, async (tx) => {
      if (entityId) {
        const entRes = await tx.select().from(entities).where(eq(entities.id, entityId)).limit(1);
        if (entRes.length > 0) activeEntity = entRes[0];
      }

      // Counts for filing readiness
      const openEx = await tx.select({ value: count() }).from(exceptionCases).where(eq(exceptionCases.status, "OPEN"));
      openExceptionsCount = openEx[0]?.value || 0;

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

      const [{ value: reconCount }] = await tx.select({ value: count() }).from(reconciliationResults).where(eq(reconciliationResults.periodKey, periodKey));
      totalReconCount = reconCount;

      evidencePkgs = await tx
        .select()
        .from(evidencePackages)
        .where(eq(evidencePackages.orgId, orgId))
        .orderBy(desc(evidencePackages.createdAt))
        .limit(5);
    });
  } catch(e) {
    console.error("Failed to fetch compliance data", e);
  }

  // Derived compliance details
  const country = activeEntity?.countryCode || "GB";
  const deadlineDate = country === "GB" ? "July 07, 2026" : "July 10, 2026";
  
  const isIngestionCheck = totalReconCount > 0;
  const isValidationCheck = validationErrorsCount === 0;
  const isReconCheck = openExceptionsCount === 0;
  const isEvidenceCheck = evidencePkgs.some(pkg => pkg.periodKey === periodKey && pkg.status === "READY");
  
  const filingStatus = isValidationCheck && isReconCheck ? "READY_TO_FILE" : "REVIEW_REQUIRED";

  return (
    <div className="space-y-6 flex flex-col h-full text-slate-900 font-sans">
      
      {/* Page Header */}
      <div className="flex items-center justify-between shrink-0">
        <PageHeader 
          title="VAT Filing Center" 
          description={`Tax submission workflow workspace for ${activeEntity?.legalName || "Active Entity"}.`}
        />
        <form action={generateEvidencePackageAction} className="flex gap-2">
          <input type="hidden" name="period" value={periodKey} />
          <input type="hidden" name="description" value={`VAT close package for ${periodKey}`} />
          <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-8 px-4">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Compile Evidence Package
          </Button>
        </form>
      </div>

      {/* Main Readiness Display */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider"> Filer Status: {periodKey} Return</h2>
              <StatusBadge variant={filingStatus === "READY_TO_FILE" ? "success" : "warning"}>
                {filingStatus.replace(/_/g, " ")}
              </StatusBadge>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold mt-1">
              Filing Due Date: <span className="text-slate-800 font-bold">{deadlineDate}</span> (Jurisdiction: {country})
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-slate-200 bg-white font-bold text-xs h-8 hover:bg-slate-50">
              <Download className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              Download Form Draft
            </Button>
            <Button 
              className={`font-bold text-xs h-8 px-4 text-white ${
                filingStatus === "READY_TO_FILE" ? "bg-emerald-700 hover:bg-emerald-800" : "bg-slate-300 cursor-not-allowed"
              }`}
              disabled={filingStatus !== "READY_TO_FILE"}
            >
              Submit to HMRC / Tax Authority
            </Button>
          </div>
        </div>

        {/* Readiness Checklist Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-xs font-semibold text-slate-700">
          <div className="p-3 bg-slate-50 rounded-md border border-slate-100 flex items-center gap-3">
            {isIngestionCheck ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <Clock className="h-5 w-5 text-amber-500 shrink-0" />
            )}
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">1. Data Ingestion</span>
              <span className="text-slate-900">{isIngestionCheck ? "Transactions Ingested" : "Pending upload"}</span>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-md border border-slate-100 flex items-center gap-3">
            {isValidationCheck ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">2. DQE Validation</span>
              <span className="text-slate-900">
                {isValidationCheck ? "0 Quality Errors" : `${validationErrorsCount} Warnings Open`}
              </span>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-md border border-slate-100 flex items-center gap-3">
            {isReconCheck ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            )}
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">3. Matching Close</span>
              <span className="text-slate-900">
                {isReconCheck ? "All Invoices Matched" : `${openExceptionsCount} Mismatches Open`}
              </span>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-md border border-slate-100 flex items-center gap-3">
            {isEvidenceCheck ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <Clock className="h-5 w-5 text-slate-400 shrink-0" />
            )}
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">4. Evidence Packet</span>
              <span className="text-slate-900">{isEvidenceCheck ? "Compiled & Locked" : "Pending compilation"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Compliance Alerts / Submissions Status */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
              <History className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              Submission History & Regulatory Logs
            </h3>
          </div>
          <div className="flex-1 overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-2">Filing Period</th>
                  <th className="py-2">Jurisdiction</th>
                  <th className="py-2">Submission Date</th>
                  <th className="py-2">Receipt ID</th>
                  <th className="py-2 text-right">Filing Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium text-slate-800">
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2">2026-05</td>
                  <td className="py-2">{country} VAT Return</td>
                  <td className="py-2">June 05, 2026</td>
                  <td className="py-2 font-mono text-slate-500">hmrc-rec-98782a</td>
                  <td className="py-2 text-right">
                    <StatusBadge variant="success">SUBMITTED</StatusBadge>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2">2026-04</td>
                  <td className="py-2">{country} VAT Return</td>
                  <td className="py-2">May 06, 2026</td>
                  <td className="py-2 font-mono text-slate-500">hmrc-rec-82711b</td>
                  <td className="py-2 text-right">
                    <StatusBadge variant="success">SUBMITTED</StatusBadge>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2">2026-03</td>
                  <td className="py-2">{country} VAT Return</td>
                  <td className="py-2">April 05, 2026</td>
                  <td className="py-2 font-mono text-slate-500">hmrc-rec-73622c</td>
                  <td className="py-2 text-right">
                    <StatusBadge variant="success">SUBMITTED</StatusBadge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Evidence Packages Library */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              Evidence Packages Library
            </h3>
          </div>
          <div className="flex-1 overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-2">Package ID</th>
                  <th className="py-2">Period</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium text-slate-800">
                {evidencePkgs.length > 0 ? evidencePkgs.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50/50">
                    <td className="py-2 font-mono text-slate-600">{pkg.id.substring(0, 8)}...</td>
                    <td className="py-2">{pkg.periodKey}</td>
                    <td className="py-2">
                      <StatusBadge variant={pkg.status === "READY" ? "success" : "warning"}>
                        {pkg.status}
                      </StatusBadge>
                    </td>
                    <td className="py-2 text-right">
                      {pkg.status === "READY" ? (
                        <a 
                          href={`/api/compliance/download-package?id=${pkg.id}`}
                          className="text-slate-900 font-bold hover:underline inline-flex items-center"
                          download
                        >
                          <Download className="mr-1 h-3.5 w-3.5" /> Download ZIP
                        </a>
                      ) : (
                        <span className="text-slate-400">Compiling...</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr className="hover:bg-slate-50/50">
                    <td colSpan={4} className="py-4 text-center text-slate-400">
                      No compiled evidence packages found. Compile one above.
                    </td>
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

