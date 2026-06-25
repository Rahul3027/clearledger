/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
"use client";

import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, Download, Search, RefreshCw, Inbox, FileWarning } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useState } from "react";

export type ExceptionRow = {
  id: string;
  priority: "High" | "Medium" | "Low";
  status: "OPEN" | "IN_REVIEW" | "WAITING_FOR_INFO" | "RESOLVED" | "CLOSED" | "REOPENED";
  documentNo: string;
  issueType: string;
  counterparty: string;
  sourceSystem: string;
  variance: string;
  amount: string;
  created: string;
  sla: "Breached" | "At Risk" | "On Track";
  owner: string;
};

const columns: ColumnDef<ExceptionRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 h-4 w-4"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
        aria-label="Select all rows"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 h-4 w-4"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(!!e.target.checked)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      const priority = row.getValue("priority") as string;
      const color = priority === "High" ? "text-red-600" : priority === "Medium" ? "text-amber-600" : "text-blue-600";
      return <div className="flex items-center gap-1.5"><div className={`h-1.5 w-1.5 rounded-full bg-current ${color}`} /><span className="text-slate-700 font-medium">{priority}</span></div>;
    }
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variantMap: Record<string, "default" | "destructive" | "warning" | "success" | "neutral" | "secondary"> = {
        OPEN: "destructive",
        IN_REVIEW: "warning",
        WAITING_FOR_INFO: "secondary",
        RESOLVED: "success",
        CLOSED: "neutral",
        REOPENED: "destructive",
      };
      return <StatusBadge variant={variantMap[status] || "neutral"}>{status.replace(/_/g, " ")}</StatusBadge>;
    }
  },
  {
    accessorKey: "documentNo",
    header: "Document No.",
    cell: ({ row }) => (
      <Link href={`/exceptions/${row.original.id}`} className="text-slate-900 font-bold hover:underline focus:outline-none focus:ring-2 focus:ring-slate-500 rounded-sm">
        {row.getValue("documentNo")}
      </Link>
    )
  },
  {
    accessorKey: "issueType",
    header: "Issue Type",
    cell: ({ row }) => <span className="font-bold text-slate-900">{row.getValue("issueType")}</span>
  },
  {
    accessorKey: "counterparty",
    header: "Counterparty",
  },
  {
    accessorKey: "sourceSystem",
    header: "Source",
  },
  {
    accessorKey: "variance",
    header: "Variance",
    cell: ({ row }) => {
      const val = row.getValue("variance") as string;
      return <span className={val !== "—" ? "text-red-600 font-bold" : "text-slate-500"}>{val}</span>;
    }
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => <span className="font-semibold text-slate-900">{row.getValue("amount")}</span>
  },
  {
    accessorKey: "created",
    header: "Logged Date",
  },
  {
    accessorKey: "sla",
    header: "SLA Status",
    cell: ({ row }) => {
      const sla = row.getValue("sla") as string;
      const color = sla === "Breached" ? "text-red-600 bg-red-50 border-red-200" : sla === "At Risk" ? "text-amber-600 bg-amber-50 border-amber-200" : "text-slate-600 bg-slate-50 border-slate-200";
      return <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${color}`}>{sla}</span>;
    }
  },
  {
    accessorKey: "owner",
    header: "Owner",
    cell: ({ row }) => {
      const owner = row.getValue("owner") as string;
      return <span className={owner === "Unassigned" ? "text-slate-400 italic font-normal" : "text-slate-700"}>{owner}</span>;
    }
  },
];

export function ExceptionQueueClient({ initialData, pageCount }: { initialData: ExceptionRow[], pageCount: number }) {
  const [data] = useState(initialData);
  const [globalFilter, setGlobalFilter] = useState("");

  const hasData = data.length > 0;

  return (
    <div className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden text-xs">
      
      {/* Queue Toolbar (Filters & Actions) */}
      <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        
        {/* Left Side: Search & Basic Filters */}
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <Input 
              type="search"
              placeholder="Search Document No, Vendor..." 
              className="pl-8 h-8 text-xs bg-white border-slate-200"
              aria-label="Search VAT issues"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" className="h-8 border-slate-200 bg-white text-slate-700 text-xs">
            <Filter className="mr-1.5 h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            Filters
          </Button>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-1.5">
            <Button variant="ghost" size="sm" className="h-7 text-slate-600 hover:text-slate-900 bg-slate-100 font-bold px-2.5">
              Open ({data.filter(d => d.status !== "RESOLVED" && d.status !== "CLOSED").length})
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-slate-500 hover:text-slate-900 font-semibold px-2.5">
              My Queue
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50 font-bold px-2.5">
              SLA Overdue
            </Button>
          </div>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 border-slate-200 bg-white text-xs font-semibold">
            <Download className="mr-1.5 h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-auto bg-white">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <Inbox className="h-10 w-10 text-slate-300 mb-3" aria-hidden="true" />
            <h2 className="text-sm font-bold text-slate-900 mb-1">No open VAT issues</h2>
            <p className="text-xs text-slate-500 mb-4">All discrepancies and validation warnings have been reconciled.</p>
            <Button variant="outline" size="sm" className="h-8 border-slate-200 text-xs bg-white font-medium">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              Refresh Log
            </Button>
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={data.filter(row => 
              row.documentNo.toLowerCase().includes(globalFilter.toLowerCase()) || 
              row.counterparty.toLowerCase().includes(globalFilter.toLowerCase()) ||
              row.issueType.toLowerCase().includes(globalFilter.toLowerCase())
            )} 
            isServerSide={false} 
          />
        )}
      </div>
    </div>
  );
}

