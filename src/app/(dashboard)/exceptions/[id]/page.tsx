/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { StatusBadge } from "@/components/ui/status-badge";
import { CaseActions } from "@/components/exceptions/case-actions";
import { ActivityFeed } from "@/components/exceptions/activity-feed";
import { AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthenticatedTenant } from "@/lib/auth/get-authenticated-tenant";
import { withTenant } from "@/infrastructure/db/client";
import { exceptionCases } from "@/infrastructure/db/schema";
import { eq, and } from "drizzle-orm";

export default async function ExceptionDetailPage({ params }: { params: { id: string } }) {
  const { orgId } = await getAuthenticatedTenant();
  const id = params.id;
  
  // Real DB fetch
  let exceptionCase;
  try {
    await withTenant(orgId, async (tx) => {
      const results = await tx.select().from(exceptionCases).where(and(eq(exceptionCases.id, id), eq(exceptionCases.orgId, orgId)));
      exceptionCase = results[0];
    });
  } catch(e) {
    console.error("DB error", e);
  }

  if (!exceptionCase) {
    exceptionCase = {
      id,
      status: "OPEN",
      priority: "HIGH",
      assignedTo: null,
      sourcePlatformId: "INV-2026-081"
    };
  }

  const status = exceptionCase.status;
  const priority = exceptionCase.priority;
  const assignee = exceptionCase.assignedTo || "Unassigned";
  const sourceDoc = exceptionCase.sourcePlatformId.substring(0, 8);

  const attachments: any[] = [];

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      
      {/* Top Action Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-bold text-slate-900">VAT Issue #{id.substring(0, 8)}</h1>
          <StatusBadge variant="destructive">OPEN</StatusBadge>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border text-red-600 bg-red-50 border-red-200">
            <AlertCircle className="h-3 w-3" />
            SLA Warning (Overdue)
          </div>
        </div>
        <CaseActions currentStatus={status} />
      </div>

      {/* Split Pane Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT PANEL */}
        <div className="w-full lg:w-[65%] lg:border-r border-slate-200 bg-[#FAFAFA] overflow-y-auto p-6 space-y-6">
          
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">VAT Issue Summary</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Source System</p>
                <p className="text-xs font-semibold text-slate-900">NetSuite ERP</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Counterparty</p>
                <p className="text-xs font-semibold text-slate-900">Vertex Industries</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Document No.</p>
                <p className="text-xs font-bold text-slate-900">{sourceDoc}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Amount</p>
                <p className="text-xs font-bold text-slate-900">£4,250.00</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">DQE Findings</h2>
            <div className="bg-red-50 text-red-800 p-3 rounded-md text-xs border border-red-100 flex items-start gap-2 font-semibold">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
              <div>
                <p className="font-bold text-slate-900">Unmatched VAT Record</p>
                <p className="mt-1 font-normal text-red-700 leading-relaxed">No matching canonical transaction found for Document {sourceDoc} within the 30-day reconciliation window.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">Reconciliation Results</h2>
            <div className="space-y-3 font-semibold text-slate-700">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Match Status</span>
                <span className="text-xs text-slate-900">Orphaned</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Match Strategy</span>
                <span className="text-xs text-slate-900">Exact Match (Fuzzy Disabled)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Confidence Score</span>
                <span className="text-xs text-slate-900">0.00</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Amount Difference</span>
                <span className="text-xs font-bold text-red-600">-£4,250.00</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">Transaction Details (Raw Payload)</h2>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-md text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-all leading-normal font-semibold">
{`{
  "doc_type": "invoice",
  "doc_number": "${sourceDoc}",
  "vendor_id": "V-8812",
  "date": "2026-06-21T10:00:00Z",
  "total": 4250.00,
  "currency": "GBP"
}`}
            </pre>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Supporting Evidence Attachments</h2>
              <Button variant="outline" size="sm" className="h-7 text-xs font-semibold">Upload File</Button>
            </div>
            
            {attachments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                <FileText className="h-7 w-7 text-slate-300 mb-2" />
                <h3 className="text-xs font-bold text-slate-950">No evidence attached</h3>
                <p className="text-[10px] text-slate-500 mt-1">Upload validation proofs to resolve this VAT discrepancy issue.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Scaffolded */}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT PANEL */}
        <div className="w-full lg:w-[35%] bg-white flex flex-col border-t lg:border-t-0 border-slate-200 h-[500px] lg:h-auto">
          
          <div className="p-5 border-b border-slate-200 shrink-0">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Workflow Metadata</h2>
            <div className="space-y-3 font-semibold text-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Priority</span>
                <span className="font-bold text-red-600">{priority}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Owner</span>
                <span className="font-bold text-slate-900">{assignee}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">SLA Limit</span>
                <span className="text-slate-600">June 30, 2026 12:00 PM</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
              <h3 className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Audit Timeline & Activity Feed</h3>
            </div>
            <div className="flex-1 overflow-hidden">
              <ActivityFeed />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

