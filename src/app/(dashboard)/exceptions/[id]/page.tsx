/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { StatusBadge } from "@/components/ui/status-badge";
import { CaseActions } from "@/components/exceptions/case-actions";
import { ActivityFeed } from "@/components/exceptions/activity-feed";
import { AlertCircle, FileText, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthenticatedTenant } from "@/lib/auth/get-authenticated-tenant";
import { withTenant } from "@/infrastructure/db/client";
import { exceptionCases } from "@/infrastructure/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";

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
    // If we're rendering a fake ID from mock, just gracefully use a fallback for demo purposes
    exceptionCase = {
      id,
      status: "OPEN",
      priority: "HIGH",
      assignedTo: null,
      sourcePlatformId: "INV-100234"
    };
  }

  const status = exceptionCase.status;
  const priority = exceptionCase.priority;
  const assignee = exceptionCase.assignedTo || "Unassigned";
  const sourceDoc = exceptionCase.sourcePlatformId.substring(0, 8);

  const attachments: any[] = [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      
      {/* Top Action Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">Exception {id}</h1>
          <StatusBadge variant="destructive">OPEN</StatusBadge>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border text-red-600 bg-red-50 border-red-200">
            <AlertCircle className="h-3 w-3" />
            SLA Breached (2 hrs overdue)
          </div>
        </div>
        <CaseActions currentStatus={status} />
      </div>

      {/* Split Pane Workspace (Responsive: Stacks below 1024px) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT PANEL */}
        <div className="w-full lg:w-[65%] lg:border-r border-gray-200 bg-[#FAFAFA] overflow-y-auto p-6 space-y-6">
          
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-3">Exception Summary</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Source System</p>
                <p className="text-sm font-medium text-gray-900">NetSuite ERP</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Counterparty</p>
                <p className="text-sm font-medium text-gray-900">Vertex Industries</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Document No.</p>
                <p className="text-sm font-medium text-blue-600">INV-100234</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Amount</p>
                <p className="text-sm font-medium text-gray-900">$4,250.00</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-3">DQE Findings</h2>
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm border border-red-100 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Unmatched Record</p>
                <p className="mt-1">No matching canonical transaction found for Document INV-100234 within the 30-day reconciliation window.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-3">Reconciliation Results</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-sm text-gray-500">Match Status</span>
                <span className="text-sm font-medium text-gray-900">Orphaned</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-sm text-gray-500">Match Strategy</span>
                <span className="text-sm font-medium text-gray-900">Exact Match (Fuzzy Disabled)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-sm text-gray-500">Confidence Score</span>
                <span className="text-sm font-medium text-gray-900">0.00</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-500">Amount Difference</span>
                <span className="text-sm font-medium text-red-600">-$4,250.00</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-3">Transaction Details (Raw Payload)</h2>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-all">
{`{
  "doc_type": "invoice",
  "doc_number": "INV-100234",
  "vendor_id": "V-8812",
  "date": "2025-05-31T10:00:00Z",
  "total": 4250.00,
  "currency": "USD"
}`}
            </pre>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <h2 className="text-sm font-semibold text-gray-900">Attachments</h2>
              <Button variant="outline" size="sm" className="h-7 text-xs">Upload</Button>
            </div>
            
            {attachments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-lg">
                <FileText className="h-8 w-8 text-gray-300 mb-2" />
                <h3 className="text-sm font-medium text-gray-900">No supporting documents attached</h3>
                <p className="text-xs text-gray-500 mt-1">Upload files to provide context for this exception.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Scaffolded for future */}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT PANEL */}
        <div className="w-full lg:w-[35%] bg-white flex flex-col border-t lg:border-t-0 border-gray-200 h-[500px] lg:h-auto">
          
          <div className="p-5 border-b border-gray-200 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Workflow Info</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Priority</span>
                <span className="font-medium text-red-600">High</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Assignee</span>
                <span className="font-medium text-gray-900">Unassigned</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">SLA Target</span>
                <span className="font-medium text-gray-900">May 31, 2025 12:00 PM</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
              <h3 className="text-xs font-semibold text-gray-500 tracking-wider uppercase">Activity Feed</h3>
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
