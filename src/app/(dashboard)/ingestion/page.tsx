/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { PageHeader } from "@/components/ui/page-header";
import { IngestionClient } from "@/components/ingestion/ingestion-client";
import { db } from "@/infrastructure/db/client";
import { extractionJobs } from "@/infrastructure/db/schema";
import { count, desc } from "drizzle-orm";

export default async function IngestionPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;
  
  let jobs: any[] = [];
  let totalCount = 0;
  let pageCount = 0;

  try {
    const [{ value }] = await db.select({ value: count() }).from(extractionJobs);
    totalCount = value;
    pageCount = Math.ceil(totalCount / pageSize);

    jobs = await db.select()
      .from(extractionJobs)
      .orderBy(desc(extractionJobs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
  } catch(e) {
    console.error("Failed to fetch extraction jobs", e);
  }

  // Map to expected frontend type
  const mappedJobs = jobs.map(j => ({
    id: j.id.substring(0, 8),
    source: "Connector " + j.connectorId.substring(0, 4),
    fileName: "Data Upload",
    status: j.status === "COMPLETED" ? "Completed" : j.status === "FAILED" ? "Failed" : j.status,
    recordsProcessed: j.rowsExtracted,
    dqeFailures: j.rowsQuarantined + j.rowsRejected,
    startedAt: j.startedAt?.toISOString().split("T")[0] || "Unknown",
    completedAt: j.completedAt?.toISOString().split("T")[0] || "Unknown"
  }));

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between shrink-0">
        <PageHeader 
          title="Ingestion Hub" 
          description="Upload files manually and monitor ingestion job statuses."
        />
      </div>

      <IngestionClient initialData={mappedJobs} pageCount={pageCount} />
    </div>
  );
}
