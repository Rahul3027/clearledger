/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
"use client";

import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, ChevronDown, Download, Search, RefreshCw, Inbox } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useState } from "react";

export type ExceptionRow = {
  id: string;
  priority: "High" | "Medium" | "Low";
  status: "OPEN" | "IN_REVIEW" | "WAITING_FOR_INFO" | "RESOLVED" | "CLOSED" | "REOPENED";
  documentNo: string;
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
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
        aria-label="Select all rows"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
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
      return <div className="flex items-center gap-1.5"><div className={`h-1.5 w-1.5 rounded-full bg-current ${color}`} /><span className="text-gray-700 font-medium">{priority}</span></div>;
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
      <Link href={`/exceptions/${row.original.id}`} className="text-blue-600 font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-sm">
        {row.getValue("documentNo")}
      </Link>
    )
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
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => <span className="font-medium text-gray-900">{row.getValue("amount")}</span>
  },
  {
    accessorKey: "created",
    header: "Created",
  },
  {
    accessorKey: "sla",
    header: "SLA",
    cell: ({ row }) => {
      const sla = row.getValue("sla") as string;
      const color = sla === "Breached" ? "text-red-600 bg-red-50 border-red-200" : sla === "At Risk" ? "text-amber-600 bg-amber-50 border-amber-200" : "text-gray-600 bg-gray-50 border-gray-200";
      return <span className={`px-2 py-0.5 rounded text-xs font-medium border ${color}`}>{sla}</span>;
    }
  },
  {
    accessorKey: "owner",
    header: "Owner",
    cell: ({ row }) => {
      const owner = row.getValue("owner") as string;
      return <span className={owner === "Unassigned" ? "text-gray-400 italic" : "text-gray-700"}>{owner}</span>;
    }
  },
];

export function ExceptionQueueClient({ initialData, pageCount }: { initialData: ExceptionRow[], pageCount: number }) {
  const [data] = useState(initialData);
  const [globalFilter, setGlobalFilter] = useState("");

  const hasData = data.length > 0;

  return (
    <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
      
      {/* Queue Toolbar (Filters & Actions) */}
      <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Left Side: Search & Basic Filters */}
        <div className="flex items-center gap-3">
          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <Input 
              type="search"
              placeholder="Search Document No, Counterparty..." 
              className="pl-9 h-9"
              aria-label="Search exceptions"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 border-gray-200 bg-gray-50 text-gray-700">
            <Filter className="mr-2 h-4 w-4 text-gray-500" aria-hidden="true" />
            Add Filter
          </Button>
          <div className="h-4 w-px bg-gray-200 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 text-gray-600 hover:text-gray-900 bg-gray-100 font-medium">
              Open (124)
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-gray-500 hover:text-gray-900">
              My Queue (12)
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 font-medium">
              SLA Breached (18)
            </Button>
          </div>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9">
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Export
          </Button>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-auto">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <Inbox className="h-12 w-12 text-gray-300 mb-4" aria-hidden="true" />
            <h2 className="text-lg font-medium text-gray-900 mb-1">No open exceptions</h2>
            <p className="text-sm text-gray-500 mb-6">All transactions have been reviewed.</p>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Refresh
            </Button>
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={data.filter(row => 
              row.documentNo.toLowerCase().includes(globalFilter.toLowerCase()) || 
              row.counterparty.toLowerCase().includes(globalFilter.toLowerCase())
            )} 
            isServerSide={false} 
          />
        )}
      </div>
    </div>
  );
}
