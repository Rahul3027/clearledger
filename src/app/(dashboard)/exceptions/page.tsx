/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { PageHeader } from "@/components/ui/page-header";
import { ExceptionQueueClient } from "@/components/exceptions/queue-client";
import { db } from "@/infrastructure/db/client";
import { exceptionCases } from "@/infrastructure/db/schema";
import { count, desc } from "drizzle-orm";

export default async function ExceptionsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;
  
  let cases: any[] = [];
  let totalCount = 0;
  let pageCount = 0;

  try {
    const [{ value }] = await db.select({ value: count() }).from(exceptionCases);
    totalCount = value;
    pageCount = Math.ceil(totalCount / pageSize);

    cases = await db.select()
      .from(exceptionCases)
      .orderBy(desc(exceptionCases.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
  } catch(e) {
    console.error("Failed to fetch exception cases", e);
  }

  // Map to expected frontend type
  const mappedExceptions = cases.map(c => ({
    id: c.id,
    priority: c.priority === "CRITICAL" ? "High" : c.priority === "HIGH" ? "High" : c.priority === "MEDIUM" ? "Medium" : "Low",
    status: c.status,
    documentNo: c.sourcePlatformId.substring(0, 8),
    counterparty: "Unknown", // Would join canonical_transactions
    sourceSystem: "Platform",
    variance: "—",
    amount: "—",
    created: c.createdAt.toISOString().split("T")[0],
    sla: "On Track",
    owner: c.assignedTo || "Unassigned"
  }));

  return (
    <div className="flex flex-col h-full space-y-6">
      <PageHeader 
        title="Exceptions Queue" 
        description="Review and resolve unmatched or anomalous transactions."
      />
      <ExceptionQueueClient initialData={mappedExceptions} pageCount={pageCount} />
    </div>
  );
}
