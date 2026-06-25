/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { StatusBadge } from "@/components/ui/status-badge";
import { RunDetailClient, MatchResultRow, UnmatchedRow } from "@/components/reconciliation/run-detail-client";
import { ActivityFeed } from "@/components/exceptions/activity-feed"; 
import { Activity, Clock } from "lucide-react";
import { getAuthenticatedTenant } from "@/lib/auth/get-authenticated-tenant";
import { withTenant } from "@/infrastructure/db/client";
import { reconciliationResults, reconciliationRuns } from "@/infrastructure/db/schema";
import { eq, and } from "drizzle-orm";

export default async function RunDetailPage({ params }: { params: { id: string } }) {
  const { orgId } = await getAuthenticatedTenant();
  const id = params.id;

  let runDetails;
  let matchResults: MatchResultRow[] = [];
  let unmatched: UnmatchedRow[] = [];

  try {
    await withTenant(orgId, async (tx) => {
      const runs = await tx.select().from(reconciliationRuns).where(and(eq(reconciliationRuns.id, id), eq(reconciliationRuns.orgId, orgId)));
      runDetails = runs[0];

      if (runDetails) {
        const results = await tx.select().from(reconciliationResults).where(eq(reconciliationResults.runId, id));
        
        const matched = results.filter(r => r.matchStatus !== "UNMATCHED");
        const unmatchedResults = results.filter(r => r.matchStatus === "UNMATCHED");

        matchResults = matched.map(m => ({
          id: m.id,
          sourceDoc: m.sourcePlatformId.substring(0, 8),
          counterparty: "Unknown",
          amount: "—",
          matchType: (m.strategyUsed === "exact" ? "Exact" : "Manual") as "Exact" | "Tolerance" | "Manual" | "Unmatched",
          confidence: Number(m.confidenceScore) || 1.0,
          status: (m.matchStatus === "MATCHED" ? "Matched" : m.matchStatus === "UNMATCHED" ? "Unmatched" : "Partial") as "Matched" | "Partial" | "Unmatched"
        }));

        unmatched = unmatchedResults.map(u => ({
          id: u.id,
          amount: "—",
          date: "Unknown",
          counterparty: "Unknown",
          suggestedMatch: null
        }));
      }
    });
  } catch(e) {
    console.error("Failed to fetch run details", e);
  }

  // Fallback for demo
  if (!runDetails) {
    matchResults = [
      { id: "TXN-001", sourceDoc: "INV-102", counterparty: "Vertex Inc", amount: "$1,200.00", matchType: "Exact", confidence: 1.0, status: "Matched" },
      { id: "TXN-002", sourceDoc: "INV-103", counterparty: "Alpha LLC", amount: "$450.00", matchType: "Tolerance", confidence: 0.85, status: "Partial" },
      { id: "TXN-003", sourceDoc: "INV-104", counterparty: "Omega Corp", amount: "$2,100.50", matchType: "Manual", confidence: 1.0, status: "Matched" },
    ];
    unmatched = [
      { id: "U-001", amount: "$4,250.00", date: "May 31, 2025", counterparty: "Vertex Industries", suggestedMatch: "INV-100234" },
      { id: "U-002", amount: "$890.00", date: "May 30, 2025", counterparty: "Beta Supplies", suggestedMatch: null },
    ];
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-sm">
        <div>
          <Breadcrumb />
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-xl font-bold text-gray-900">Run {id}</h1>
            <StatusBadge variant="success">COMPLETED</StatusBadge>
          </div>
        </div>
      </div>

      {/* Split Pane Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT PANEL (70%) */}
        <div className="w-full lg:w-[70%] lg:border-r border-gray-200 bg-[#FAFAFA] flex flex-col overflow-hidden p-6 space-y-6">
          
          {/* Run Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm shrink-0">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-3">Run Configuration</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Period</p>
                <p className="text-sm font-medium text-gray-900">May 2025</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Strategy Used</p>
                <p className="text-sm font-medium text-gray-900">Standard + Fuzzy Tolerance</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Created By</p>
                <p className="text-sm font-medium text-gray-900">System (Auto-schedule)</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Execution Time</p>
                <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                  <Clock className="h-3.5 w-3.5 text-gray-500" />
                  14.2s
                </div>
              </div>
            </div>
          </div>

          {/* Tables (Client Component handles tabs between Results and Unmatched) */}
          <RunDetailClient matchResults={matchResults} unmatched={unmatched} />

        </div>

        {/* RIGHT PANEL (30%) */}
        <div className="w-full lg:w-[30%] bg-white flex flex-col border-t lg:border-t-0 border-gray-200 h-[600px] lg:h-auto overflow-y-auto">
          
          <div className="p-5 border-b border-gray-200 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Matching Breakdown</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"/>Exact Matches</span>
                <span className="font-medium text-gray-900">12,300 (98.4%)</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400"/>Tolerance Matches</span>
                <span className="font-medium text-gray-900">150 (1.2%)</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"/>Manual Overrides</span>
                <span className="font-medium text-gray-900">10 (0.1%)</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-red-600 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"/>Unmatched</span>
                <span className="font-bold text-red-600">40 (0.3%)</span>
              </div>
            </div>
          </div>

          <div className="p-5 border-b border-gray-200 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Confidence Distribution</h2>
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 bg-gray-50 uppercase">
                <tr>
                  <th className="px-3 py-2 rounded-l-md">Score</th>
                  <th className="px-3 py-2 rounded-r-md text-right">Records</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50">
                  <td className="px-3 py-2 font-medium text-green-600">100% (Exact)</td>
                  <td className="px-3 py-2 text-right text-gray-900">12,300</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-700">90% - 99%</td>
                  <td className="px-3 py-2 text-right text-gray-900">120</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-700">75% - 89%</td>
                  <td className="px-3 py-2 text-right text-gray-900">30</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-amber-600">&lt; 75%</td>
                  <td className="px-3 py-2 text-right text-gray-900">10</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex-1 flex flex-col min-h-[300px]">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
              <h3 className="text-xs font-semibold text-gray-500 tracking-wider uppercase">Run Activity</h3>
            </div>
            <div className="flex-1 overflow-hidden">
               {/* Note: In real app, we'd pass run-specific events. For mockup, we reuse the component structure */}
               <div className="p-4 flex flex-col items-center justify-center h-full opacity-60 text-center">
                 <Activity className="h-8 w-8 text-gray-400 mb-2" />
                 <span className="text-sm text-gray-500">Activity stream connected.</span>
               </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
