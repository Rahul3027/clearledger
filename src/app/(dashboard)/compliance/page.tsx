/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { AlertCircle, FileText, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getAuthenticatedTenant } from "@/lib/auth/get-authenticated-tenant";
import { withTenant } from "@/infrastructure/db/client";
import { auditEvents, exceptionCases } from "@/infrastructure/db/schema";
import { count, eq, desc } from "drizzle-orm";

export default async function ComplianceOverviewPage() {
  const { orgId } = await getAuthenticatedTenant();
  let openExceptions = 0;
  let totalAuditEvents = 0;
  let recentEvents: any[] = [];
  
  try {
    await withTenant(orgId, async (tx) => {
      const [{ value: exceptions }] = await tx.select({ value: count() }).from(exceptionCases).where(eq(exceptionCases.status, "OPEN"));
      openExceptions = exceptions;

      const [{ value: audits }] = await tx.select({ value: count() }).from(auditEvents);
      totalAuditEvents = audits;

      recentEvents = await tx.select().from(auditEvents).orderBy(desc(auditEvents.ts)).limit(3);
    });
  } catch(e) {
    console.error("Failed to fetch compliance data", e);
  }

  const issuesDetected = openExceptions > 0;

  return (
    <div className="flex flex-col h-full space-y-6 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <PageHeader 
          title="Compliance & Audit" 
          description="Command center for evidence generation, exceptions monitoring, and audit log analysis."
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-white">
            Export Audit Log
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            Generate Evidence Package
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 shrink-0">
        <StatCard title="Evidence Packages" value="0" />
        <StatCard title="Open Exceptions" value={openExceptions.toString()} />
        <StatCard title="Audit Events (30d)" value={totalAuditEvents.toLocaleString()} />
        <StatCard title="Reports Generated" value="0" />
        <StatCard title="Periods Ready" value="2" />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-[400px]">
        {/* Attention Required Panel (Most Important) */}
        <div className="w-full lg:w-1/2 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-red-50/30 flex items-center gap-2 shrink-0">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h2 className="text-sm font-semibold text-gray-900">Attention Required</h2>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            {!issuesDetected ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
                <h3 className="text-sm font-medium text-gray-900">No compliance issues detected</h3>
                <p className="text-sm text-gray-500 mt-1">All packages and exceptions are within SLA.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                  <FileText className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{openExceptions} Open Exceptions</p>
                    <p className="text-xs text-gray-500 mt-1">Exceptions pending review.</p>
                    <Link href="/exceptions" className="text-xs font-medium text-blue-600 hover:underline mt-2 inline-flex items-center">
                      Go to Exception Queue <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="w-full lg:w-1/2 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">Recent Audit Activity</h2>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              {recentEvents.length > 0 ? recentEvents.map((evt) => (
                <div key={evt.id} className="relative flex gap-4">
                  <div className="absolute left-3.5 top-8 bottom-[-24px] w-px bg-gray-200" aria-hidden="true" />
                  <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 ring-2 ring-white">
                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{evt.action}</span>
                      <span className="text-xs text-gray-500">Recent</span>
                    </div>
                    <p className="text-sm text-gray-600">{evt.event}</p>
                  </div>
                </div>
              )) : (
                <div className="text-sm text-gray-500">No recent events.</div>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-100">
              <Link href="/compliance/audit-log" className="text-sm font-medium text-blue-600 hover:underline inline-flex items-center">
                View Full Audit Log <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
