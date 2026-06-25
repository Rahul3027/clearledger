/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { AuditLogClient } from "@/components/compliance/audit-log-client";
import { getAuthenticatedTenant } from "@/lib/auth/get-authenticated-tenant";
import { withTenant } from "@/infrastructure/db/client";
import { auditEvents } from "@/infrastructure/db/schema";
import { count, desc } from "drizzle-orm";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { orgId } = await getAuthenticatedTenant();
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;
  
  let eventsList: any[] = [];
  let totalCount = 0;
  let pageCount = 0;

  try {
    await withTenant(orgId, async (tx) => {
      const [{ value }] = await tx.select({ value: count() }).from(auditEvents);
      totalCount = value;
      pageCount = Math.ceil(totalCount / pageSize);

      eventsList = await tx.select()
        .from(auditEvents)
        .orderBy(desc(auditEvents.ts))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
    });
  } catch(e) {
    console.error("Failed to fetch audit events", e);
  }

  const mappedEvents = eventsList.map(e => ({
    id: e.id,
    timestamp: e.timestamp.toISOString(),
    user: e.actorId,
    event: e.action,
    resourceType: "System",
    resourceId: e.id.substring(0, 8),
    action: e.action,
    payload: JSON.stringify({
      event_id: e.id,
      actor: e.actorId,
      action: e.action,
      event: e.event
    }, null, 2)
  }));

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between shrink-0">
        <PageHeader 
          title="Audit Log" 
          description="Immutable ledger of system and operator actions for compliance investigations."
        />
        <Button variant="outline" className="bg-white">
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          Export CSV
        </Button>
      </div>

      <AuditLogClient initialData={mappedEvents} pageCount={pageCount} />
    </div>
  );
}
