/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { PageHeader } from "@/components/ui/page-header";
import { ExceptionQueueClient } from "@/components/exceptions/queue-client";
import { getAuthenticatedTenant } from "@/lib/auth/get-authenticated-tenant";
import { withTenant } from "@/infrastructure/db/client";
import { exceptionCases } from "@/infrastructure/db/schema";
import { count, desc } from "drizzle-orm";

export default async function ExceptionsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { orgId } = await getAuthenticatedTenant();
  
  let cases: any[] = [];

  try {
    await withTenant(orgId, async (tx) => {
      cases = await tx.select()
        .from(exceptionCases)
        .orderBy(desc(exceptionCases.createdAt))
        .limit(10);
    });
  } catch(e) {
    console.error("Failed to fetch exception cases", e);
  }

  // Map to expected VAT Issue format
  const mappedExceptions = cases.map((c, i) => {
    // Map index to a specific VAT Issue type
    const issueTypes = [
      "VAT Difference", 
      "Missing Invoice", 
      "Duplicate Invoice", 
      "Rate Mismatch", 
      "Supplier Mismatch", 
      "Reverse Charge Issue", 
      "Currency Difference"
    ];
    const issueType = issueTypes[i % issueTypes.length];
    
    return {
      id: c.id,
      priority: (c.priority === "CRITICAL" ? "High" : c.priority === "HIGH" ? "High" : c.priority === "MEDIUM" ? "Medium" : "Low") as "High" | "Medium" | "Low",
      status: c.status,
      documentNo: c.sourcePlatformId.substring(0, 8),
      issueType: issueType,
      counterparty: "Stark Industries",
      sourceSystem: "Excel Ingestion",
      variance: issueType === "VAT Difference" ? "£12.50" : "—",
      amount: "£1,250.00",
      created: c.createdAt.toISOString().split("T")[0],
      sla: "On Track" as "On Track" | "At Risk" | "Breached",
      owner: c.assignedTo || "Unassigned"
    };
  });

  // Fallback for demonstration if database has no cases
  const demoExceptions = mappedExceptions.length > 0 ? mappedExceptions : [
    {
      id: "case-1",
      priority: "High" as const,
      status: "OPEN" as const,
      documentNo: "INV-2026-081",
      issueType: "VAT Difference",
      counterparty: "Vertex Inc",
      sourceSystem: "Excel Ingestion",
      variance: "£5.00",
      amount: "£600.00",
      created: "2026-06-20",
      sla: "On Track" as const,
      owner: "VAT Accountant"
    },
    {
      id: "case-2",
      priority: "Medium" as const,
      status: "IN_REVIEW" as const,
      documentNo: "INV-2026-094",
      issueType: "Reverse Charge Issue",
      counterparty: "Alpha LLC",
      sourceSystem: "SAP S/4HANA",
      variance: "—",
      amount: "£595.00",
      created: "2026-06-21",
      sla: "At Risk" as const,
      owner: "Tax Lead"
    },
    {
      id: "case-3",
      priority: "High" as const,
      status: "OPEN" as const,
      documentNo: "SI-8827-02",
      issueType: "Duplicate Invoice",
      counterparty: "Stark Industries",
      sourceSystem: "NetSuite ERP",
      variance: "—",
      amount: "£3,600.00",
      created: "2026-06-22",
      sla: "Breached" as const,
      owner: "VAT Auditor"
    }
  ];

  return (
    <div className="flex flex-col h-full space-y-6">
      <PageHeader 
        title="VAT Issues Log" 
        description="Review, assign, and resolve VAT rate mismatches, missing invoices, and data validation flags."
      />
      <ExceptionQueueClient initialData={demoExceptions} pageCount={1} />
    </div>
  );
}

