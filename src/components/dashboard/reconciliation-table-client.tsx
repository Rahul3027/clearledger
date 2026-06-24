"use client";

import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

// Type export could be moved to a shared domain types file later
export type ReconRow = {
  id: string;
  date: string;
  documentNo: string;
  counterparty: string;
  sourceSystem: string;
  matchType: string;
  status: "Matched" | "Partially Matched" | "Unmatched";
  priority: "High" | "Medium" | "Low" | "—";
  variance: string;
  amount: string;
  sla: "On Track" | "At Risk" | "Overdue";
  owner: string;
};

const columns: ColumnDef<ReconRow>[] = [
  {
    accessorKey: "date",
    header: "Date",
  },
  {
    accessorKey: "documentNo",
    header: "Document No.",
    cell: ({ row }) => <span className="text-blue-600 font-medium hover:underline cursor-pointer">{row.getValue("documentNo")}</span>
  },
  {
    accessorKey: "counterparty",
    header: "Counterparty",
  },
  {
    accessorKey: "sourceSystem",
    header: "Source System",
  },
  {
    accessorKey: "matchType",
    header: "Match Type",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variant = status === "Matched" ? "success" : status === "Unmatched" ? "destructive" : "warning";
      return <StatusBadge variant={variant}>{status}</StatusBadge>;
    }
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      const priority = row.getValue("priority") as string;
      if (priority === "—") return <span className="text-gray-400">—</span>;
      const color = priority === "High" ? "text-red-600" : priority === "Medium" ? "text-amber-600" : "text-blue-600";
      return <div className="flex items-center gap-1.5"><div className={`h-1.5 w-1.5 rounded-full bg-current ${color}`} /><span className="text-gray-700">{priority}</span></div>;
    }
  },
  {
    accessorKey: "variance",
    header: "Variance",
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => <span className="font-medium">{row.getValue("amount")}</span>
  },
  {
    accessorKey: "sla",
    header: "SLA",
    cell: ({ row }) => {
      const sla = row.getValue("sla") as string;
      const color = sla === "On Track" ? "text-green-600" : sla === "Overdue" ? "text-red-600" : "text-amber-600";
      return <div className="flex items-center gap-1.5"><div className={`h-1.5 w-1.5 rounded-full bg-current ${color}`} /><span className="text-gray-700">{sla}</span></div>;
    }
  },
  {
    id: "actions",
    cell: () => (
      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900" aria-label="Row Actions">
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </Button>
    ),
  },
];

export function ReconciliationTableClient({ data }: { data: ReconRow[] }) {
  return (
    <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-gray-200 px-6 flex items-center space-x-6" role="tablist">
        <button className="h-12 border-b-2 border-blue-600 text-blue-600 font-medium text-sm px-1" role="tab" aria-selected="true" id="tab-reconciliation" aria-controls="panel-reconciliation">
          Reconciliation Results
        </button>
        <button className="h-12 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm px-1" role="tab" aria-selected="false" id="tab-exceptions">
          Exceptions
        </button>
        <button className="h-12 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm px-1" role="tab" aria-selected="false" id="tab-runs">
          Runs
        </button>
      </div>

      <div className="p-6 overflow-auto" role="tabpanel" id="panel-reconciliation" aria-labelledby="tab-reconciliation">
        <DataTable 
          columns={columns} 
          data={data} 
          searchKey="documentNo"
          searchPlaceholder="Search by document, counterparty..."
        />
      </div>
    </div>
  );
}
