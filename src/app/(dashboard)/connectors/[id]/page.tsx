/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { ConnectorDetailClient, SyncHistoryRow, WebhookEventRow } from "@/components/connectors/connector-detail-client";
import { RefreshCw, PowerOff, Key, Bell } from "lucide-react";
import { getAuthenticatedTenant } from "@/lib/auth/get-authenticated-tenant";
import { withTenant } from "@/infrastructure/db/client";
import { connectors, extractionJobs } from "@/infrastructure/db/schema";
import { eq, desc, and } from "drizzle-orm";

export default async function ConnectorDetailPage({ params }: { params: { id: string } }) {
  const { orgId } = await getAuthenticatedTenant();
  const id = params.id;

  let connector;
  let mockSyncs: SyncHistoryRow[] = [];
  
  try {
    await withTenant(orgId, async (tx) => {
      const res = await tx.select().from(connectors).where(and(eq(connectors.id, id), eq(connectors.orgId, orgId)));
      connector = res[0];

      if (connector) {
        const jobs = await tx.select().from(extractionJobs).where(eq(extractionJobs.connectorId, id)).orderBy(desc(extractionJobs.createdAt));
        mockSyncs = jobs.map(j => ({
          id: j.id.substring(0, 8),
          startedAt: j.startedAt?.toISOString() || "Unknown",
          completedAt: j.completedAt?.toISOString() || "Unknown",
          status: j.status === "COMPLETED" ? "Success" : "Failed",
          records: j.rowsExtracted || 0,
          duration: "1m 30s"
        }));
      }
    });
  } catch(e) {
    console.error("Failed to fetch connector", e);
  }

  // Fallback for mocked UI interactions
  if (!connector) {
    connector = { displayName: "Stripe Billing", status: "ACTIVE", connectorType: "Payment Gateway", authScheme: "API Key" };
    mockSyncs = [
      { id: "SYNC-992", startedAt: "Today, 10:00 AM", completedAt: "Today, 10:02 AM", status: "Success", records: 450, duration: "2m 14s" },
      { id: "SYNC-991", startedAt: "Today, 09:00 AM", completedAt: "Today, 09:05 AM", status: "Success", records: 2100, duration: "5m 01s" },
      { id: "SYNC-990", startedAt: "Today, 08:00 AM", completedAt: "Today, 08:00 AM", status: "Failed", records: 0, duration: "4s" },
    ];
  }

  const mockWebhooks: WebhookEventRow[] = [
    { id: "EVT-8821", type: "invoice.created", status: "Processed", receivedAt: "Today, 10:15 AM" },
    { id: "EVT-8820", type: "payment.succeeded", status: "Processed", receivedAt: "Today, 10:12 AM" },
    { id: "EVT-8819", type: "invoice.updated", status: "Dropped", receivedAt: "Today, 09:45 AM" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-sm">
        <div>
          <Breadcrumb />
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-xl font-bold text-gray-900">Stripe Billing</h1>
            <StatusBadge variant="success">Active</StatusBadge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="bg-white">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Sync Now
          </Button>
        </div>
      </div>

      {/* Split Pane Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT PANEL (70%) */}
        <div className="w-full lg:w-[70%] lg:border-r border-gray-200 bg-[#FAFAFA] flex flex-col overflow-hidden p-6 space-y-6">
          
          {/* Connector Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm shrink-0">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-3">Connector Configuration</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Type</p>
                <p className="text-sm font-medium text-gray-900">{connector.connectorType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Authentication</p>
                <p className="text-sm font-medium text-gray-900">{connector.authScheme}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Created By</p>
                <p className="text-sm font-medium text-gray-900">System</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Last Sync</p>
                <p className="text-sm font-medium text-gray-900">10 mins ago</p>
              </div>
            </div>

            {/* Credential UX */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-2 rounded border border-gray-200"><Key className="h-4 w-4 text-gray-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">{connector.authScheme}</p>
                  <p className="text-sm font-mono text-gray-900">•••••••••••••••••••••••••••••</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs">Rotate Credentials</Button>
            </div>
          </div>

          {/* Tables (Client Component handles tabs between Syncs and Webhooks) */}
          <ConnectorDetailClient syncHistory={mockSyncs} webhooks={mockWebhooks} />

        </div>

        {/* RIGHT PANEL (30%) */}
        <div className="w-full lg:w-[30%] bg-white flex flex-col border-t lg:border-t-0 border-gray-200 h-[600px] lg:h-auto overflow-y-auto">
          
          <div className="p-5 border-b border-gray-200 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Health Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600 flex items-center gap-2">Current Health</span>
                <span className="font-medium text-green-600 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"/> Healthy</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">Total Failures (30d)</span>
                <span className="font-medium text-gray-900">12</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">Consecutive Failures</span>
                <span className="font-medium text-gray-900">0</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Circuit Breaker</span>
                <span className="font-medium text-gray-900">Closed (Active)</span>
              </div>
            </div>
          </div>

          <div className="p-5 border-b border-gray-200 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-2 flex flex-col">
              <Button variant="outline" className="justify-start text-gray-700">
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Force Sync
              </Button>
              <Button variant="outline" className="justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                <PowerOff className="mr-2 h-4 w-4" aria-hidden="true" /> Disable Connector
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-[300px]">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 shrink-0 flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-500 tracking-wider uppercase">Recent Notifications</h3>
            </div>
            <div className="flex-1 overflow-hidden p-5">
               <div className="space-y-4">
                 <div className="border-l-2 border-amber-400 pl-3">
                   <p className="text-xs text-gray-500 mb-0.5">May 30, 2025</p>
                   <p className="text-sm font-medium text-gray-900">API Rate Limit Exceeded</p>
                   <p className="text-xs text-gray-600 mt-1">Sync delayed automatically by 5 minutes to back off rate limits.</p>
                 </div>
               </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
