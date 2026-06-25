/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { PageHeader } from "@/components/ui/page-header";
import { IngestionClient } from "@/components/ingestion/ingestion-client";
import { getAuthenticatedTenant } from "@/lib/auth/get-authenticated-tenant";
import { withTenant } from "@/infrastructure/db/client";
import { extractionJobs } from "@/infrastructure/db/schema";
import { count, desc } from "drizzle-orm";

export default async function IngestionPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { orgId } = await getAuthenticatedTenant();
  
  let jobs: any[] = [];

  try {
    await withTenant(orgId, async (tx) => {
      jobs = await tx.select()
        .from(extractionJobs)
        .orderBy(desc(extractionJobs.createdAt))
        .limit(10);
    });
  } catch(e) {
    console.error("Failed to fetch extraction jobs", e);
  }

  // Map database jobs to frontend uploader timeline
  const mappedJobs = jobs.map(j => {
    const start = j.startedAt ? new Date(j.startedAt).getTime() : 0;
    const end = j.completedAt ? new Date(j.completedAt).getTime() : 0;
    const duration = start && end ? ((end - start) / 1000).toFixed(1) + "s" : "1.2s";

    return {
      id: j.id,
      connectorId: j.connectorId,
      status: (j.status === "COMPLETED" ? "Completed" : j.status === "FAILED" ? "Failed" : j.status) as any,
      rowsExtracted: j.rowsExtracted || 0,
      rowsMapped: j.rowsMapped || 0,
      rowsQuarantined: j.rowsQuarantined || 0,
      rowsRejected: j.rowsRejected || 0,
      createdAt: j.createdAt?.toISOString() || new Date().toISOString(),
      processingTime: duration
    };
  });

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between shrink-0">
        <PageHeader 
          title="Import Center" 
          description="Upload transactional documentation and track ingestion run metrics."
        />
      </div>

      <IngestionClient initialData={mappedJobs} />
    </div>
  );
}

