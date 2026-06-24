/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Download, Filter } from "lucide-react";
import { ReconciliationTableClient, ReconRow } from "@/components/dashboard/reconciliation-table-client";

import { db } from "@/infrastructure/db/client";
import { reconciliationRuns, reconciliationResults, exceptionCases, auditEvents } from "@/infrastructure/db/schema";
import { count, eq, desc } from "drizzle-orm";

export default async function DashboardOverviewPage() {
  const orgId = "00000000-0000-0000-0000-000000000001"; // In real app, from auth session
  
  let openExceptionsCount = 0;
  let totalReconCount = 0;
  let recentExceptions: any[] = [];
  let recentAuditEvents: any[] = [];

  try {
    const [{ value: exceptionCount }] = await db.select({ value: count() }).from(exceptionCases).where(eq(exceptionCases.status, "OPEN"));
    openExceptionsCount = exceptionCount;

    const [{ value: reconCount }] = await db.select({ value: count() }).from(reconciliationRuns);
    totalReconCount = reconCount;

    recentExceptions = await db.select().from(exceptionCases).orderBy(desc(exceptionCases.createdAt)).limit(3);
    recentAuditEvents = await db.select().from(auditEvents).orderBy(desc(auditEvents.ts)).limit(3);
  } catch (e) {
    console.error("Database connection failed, using empty states.", e);
  }
  
  return (
    <div className="space-y-6 flex flex-col h-full">
      
      <PageHeader 
        title="Reconciliation" 
        description="Monitor transaction matches, exceptions, and reconciliation health."
        actions={
          <>
            <Button variant="outline" className="bg-white">
              <Filter className="mr-2 h-4 w-4 text-gray-500" aria-hidden="true" />
              May 1 – May 31, 2025
            </Button>
            <Button variant="outline" className="bg-white">
              <Download className="mr-2 h-4 w-4 text-gray-500" aria-hidden="true" />
              Export
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard 
          title="Total Transactions" 
          value="128,420" 
          trend={{ value: "12.4%", isPositive: true }} 
          description="vs Apr 1 - Apr 30" 
        />
        <StatCard 
          title="Reconciliation Runs" 
          value={totalReconCount.toLocaleString()} 
          description="Total execution runs" 
        />
        <StatCard 
          title="Needs Review" 
          value="8,417" 
          description="Partially matched" 
        />
        <StatCard 
          title="Open Exceptions" 
          value={openExceptionsCount.toLocaleString()} 
          description="Unmatched records" 
        />
        <StatCard 
          title="SLA Breaches" 
          value="426" 
          description="Past SLA" 
          className="border-red-100"
        />
        <StatCard 
          title="Sync Failures" 
          value="2" 
          description="Check integrations" 
          className="border-amber-100"
        />
      </div>

      <ReconciliationTableClient data={[]} />

      {/* Action Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Exceptions */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center justify-between">
            Recent Exceptions
            <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600">View All</Button>
          </h3>
          <div className="space-y-3">
            {recentExceptions.length > 0 ? recentExceptions.map((ex) => (
              <div key={ex.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">Exception #{ex.id.substring(0, 8)}</p>
                  <p className="text-xs text-gray-500">Source: {ex.sourcePlatformId}</p>
                </div>
                <StatusBadge variant="destructive">{ex.status}</StatusBadge>
              </div>
            )) : <div className="text-sm text-gray-500 py-2">No recent exceptions</div>}
          </div>
        </div>

        {/* Recent Sync Runs */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center justify-between">
            Recent Sync Runs
            <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600">View All</Button>
          </h3>
          <div className="space-y-3">
            {['NetSuite ERP', 'SAP S/4HANA', 'Stripe Payments'].map((sys, i) => (
              <div key={sys} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{sys}</p>
                  <p className="text-xs text-gray-500">{10 - i} mins ago</p>
                </div>
                <StatusBadge variant={i === 2 ? "warning" : "success"}>
                  {i === 2 ? "Degraded" : "Completed"}
                </StatusBadge>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Audit Events */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center justify-between">
            Recent Audit Events
            <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600">View All</Button>
          </h3>
          <div className="space-y-3">
            {recentAuditEvents.length > 0 ? recentAuditEvents.map((evt) => (
              <div key={evt.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{evt.event}</p>
                  <p className="text-xs text-gray-500">by {evt.actorId}</p>
                </div>
                <span className="text-xs text-gray-400">Recent</span>
              </div>
            )) : <div className="text-sm text-gray-500 py-2">No recent events</div>}
          </div>
        </div>

      </div>

    </div>
  );
}
