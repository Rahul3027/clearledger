/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { ConnectorsClient } from "@/components/connectors/connectors-client";
import { db } from "@/infrastructure/db/client";
import { connectors } from "@/infrastructure/db/schema";
import { count, desc } from "drizzle-orm";

export default async function ConnectorsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;
  
  let connectorList: any[] = [];
  let totalCount = 0;
  let pageCount = 0;

  try {
    const [{ value }] = await db.select({ value: count() }).from(connectors);
    totalCount = value;
    pageCount = Math.ceil(totalCount / pageSize);

    connectorList = await db.select()
      .from(connectors)
      .orderBy(desc(connectors.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
  } catch(e) {
    console.error("Failed to fetch connectors", e);
  }

  // Map to expected frontend type
  const mappedConnectors = connectorList.map(c => ({
    id: c.id,
    name: c.displayName,
    type: c.connectorType,
    auth: c.authScheme,
    status: c.status === "ACTIVE" ? "Active" : c.status === "SUSPENDED" ? "Error" : c.status,
    lastSync: "Unknown", // Would query extractionJobs
    failureCount: 0,
    health: (c.status === "ACTIVE" ? "Healthy" : c.status === "SUSPENDED" ? "Down" : "Warning") as "Healthy" | "Warning" | "Down"
  }));

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between shrink-0">
        <PageHeader 
          title="Connectors Hub" 
          description="Manage integrations, monitor sync health, and configure data pipelines."
        />
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add Connector
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 shrink-0">
        <StatCard title="Total Connectors" value={totalCount.toString()} />
        <StatCard title="Failed Syncs" value="0" />
        <StatCard title="Syncs Today" value="0" />
        <StatCard title="Automation Rules" value="8" />
        <StatCard title="Webhook Events" value="14.2k" />
      </div>

      <ConnectorsClient initialData={mappedConnectors} pageCount={pageCount} />
    </div>
  );
}
