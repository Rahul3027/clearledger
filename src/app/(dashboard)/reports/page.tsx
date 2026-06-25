/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileArchive, FileText, Download, ShieldCheck, FileCheck2, Table } from "lucide-react";
import { cookies } from "next/headers";
import { getAuthenticatedTenant } from "@/lib/auth/get-authenticated-tenant";
import { withTenant } from "@/infrastructure/db/client";
import { entities } from "@/infrastructure/db/schema";
import { eq } from "drizzle-orm";

interface ReportItem {
  name: string;
  description: string;
  outcomes: string;
  formats: Array<{ type: "PDF" | "Excel" | "CSV" | "ZIP"; url: string }>;
}

export default async function ReportsPage() {
  const { orgId, entityId } = await getAuthenticatedTenant();
  const cookieStore = cookies();
  const periodKey = cookieStore.get("selected_tax_period")?.value || "2026-06";

  let activeEntity: any = null;
  try {
    await withTenant(orgId, async (tx) => {
      if (entityId) {
        const entRes = await tx.select().from(entities).where(eq(entities.id, entityId)).limit(1);
        if (entRes.length > 0) activeEntity = entRes[0];
      }
    });
  } catch (err) {
    console.error("Reports page db query failed:", err);
  }

  const reportsList: ReportItem[] = [
    {
      name: "VAT Return Summary Form",
      description: "HMRC Form 100 style summary declaration layout mapping Box 1 to Box 9 tax liabilities.",
      outcomes: "Pre-filing confirmation, auditor sign-offs, and compliance reconciliation validation.",
      formats: [
        { type: "PDF", url: `/api/reports/vat-form?format=pdf&period=${periodKey}` },
        { type: "Excel", url: `/api/reports/vat-form?format=xlsx&period=${periodKey}` }
      ]
    },
    {
      name: "VAT Reconciliation Summary Report",
      description: "Variance analysis statement showing exact matching, tolerance adjustments, and manual match overrides.",
      outcomes: "Period close variance sign-offs, ledger discrepancy investigations.",
      formats: [
        { type: "PDF", url: `/api/reports/reconciliation?format=pdf&period=${periodKey}` },
        { type: "Excel", url: `/api/reports/reconciliation?format=xlsx&period=${periodKey}` },
        { type: "CSV", url: `/api/reports/reconciliation?format=csv&period=${periodKey}` }
      ]
    },
    {
      name: "VAT Issues & Discrepancies Log",
      description: "Chronological audit ledger of rate mismatches, missing invoices, duplicates, and country validation errors.",
      outcomes: "SLA compliance tracking, resolver workload analysis, risk profile assessments.",
      formats: [
        { type: "Excel", url: `/api/reports/exceptions?format=xlsx&period=${periodKey}` },
        { type: "CSV", url: `/api/reports/exceptions?format=csv&period=${periodKey}` }
      ]
    },
    {
      name: "System Audit Activity Ledger",
      description: "Immutable logs tracking configuration changes, upload runs, user access logs, and manual matching overrides.",
      outcomes: "External auditor validations, compliance integrity certificates.",
      formats: [
        { type: "CSV", url: `/api/reports/audit-trail?format=csv&period=${periodKey}` }
      ]
    },
    {
      name: "Filing Evidence Package (Auditor ZIP)",
      description: "Bundled package containing matching results, raw canonical transaction payloads, DQE outputs, and active validation logs.",
      outcomes: "Immutable transaction audit trails, tax authority review packages.",
      formats: [
        { type: "ZIP", url: `/api/reports/evidence-package/download?period=${periodKey}` }
      ]
    }
  ];

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      <PageHeader
        title="Reports Workspace"
        description={`Export compliance summaries, audit trials, and filing packages for ${activeEntity?.legalName || "Active Entity"} (${periodKey}).`}
      />

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportsList.map((rep) => (
          <div key={rep.name} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <h3 className="text-xs font-bold text-slate-900 flex items-center">
                  {rep.formats.some(f => f.type === "ZIP") ? (
                    <FileArchive className="mr-1.5 h-4 w-4 text-slate-500" />
                  ) : rep.formats.some(f => f.type === "PDF") ? (
                    <FileText className="mr-1.5 h-4 w-4 text-slate-500" />
                  ) : (
                    <Table className="mr-1.5 h-4 w-4 text-slate-500" />
                  )}
                  {rep.name}
                </h3>
              </div>
              <p className="text-[11px] text-slate-600 font-semibold leading-relaxed mt-2">{rep.description}</p>
              
              <div className="mt-3.5 bg-slate-50 rounded-md p-2.5 border border-slate-100 text-[10px] text-slate-600 leading-normal">
                <span className="font-bold text-slate-500 uppercase tracking-wider block text-[8px] mb-1">Business Outcomes Served:</span>
                <span className="font-semibold text-slate-700">{rep.outcomes}</span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-1.5 justify-end">
              <span className="text-[10px] text-slate-400 font-semibold mr-1">Available Exports:</span>
              {rep.formats.map((fmt) => (
                <Button 
                  key={fmt.type}
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-[10px] font-bold border-slate-200 bg-white hover:bg-slate-50"
                  asChild
                >
                  <a href={fmt.url} download>
                    <Download className="mr-1 h-3 w-3 text-slate-500" />
                    {fmt.type}
                  </a>
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
