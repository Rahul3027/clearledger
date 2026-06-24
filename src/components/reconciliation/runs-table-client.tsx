"use client";

import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, Search, Inbox, Play } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useState } from "react";

export type RunRow = {
  id: string;
  period: string;
  status: "COMPLETED" | "RUNNING" | "FAILED" | "PENDING";
  sourceRecords: number;
  targetRecords: number;
  exactMatches: number;
  toleranceMatches: number;
  unmatched: number;
  matchPercentage: string;
  createdBy: string;
  createdAt: string;
};

const columns: ColumnDef<RunRow>[] = [
  {
    accessorKey: "id",
    header: "Run ID",
    cell: ({ row }) => (
      <Link href={`/reconciliation/runs/${row.original.id}`} className="text-blue-600 font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-sm">
        {row.getValue("id")}
      </Link>
    )
  },
  {
    accessorKey: "period",
    header: "Period",
    cell: ({ row }) => <span className="text-gray-900 font-medium">{row.getValue("period")}</span>
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variantMap: Record<string, "success" | "warning" | "destructive" | "neutral"> = {
        COMPLETED: "success",
        RUNNING: "warning",
        FAILED: "destructive",
        PENDING: "neutral",
      };
      return <StatusBadge variant={variantMap[status] || "neutral"}>{status}</StatusBadge>;
    }
  },
  {
    accessorKey: "sourceRecords",
    header: "Source Records",
  },
  {
    accessorKey: "targetRecords",
    header: "Target Records",
  },
  {
    accessorKey: "exactMatches",
    header: "Exact Matches",
    cell: ({ row }) => <span className="text-gray-900 font-medium">{row.getValue("exactMatches")}</span>
  },
  {
    accessorKey: "toleranceMatches",
    header: "Tolerance Matches",
  },
  {
    accessorKey: "unmatched",
    header: "Unmatched",
    cell: ({ row }) => {
      const count = row.getValue("unmatched") as number;
      return <span className={count > 0 ? "text-amber-700 font-medium" : "text-gray-500"}>{count}</span>;
    }
  },
  {
    accessorKey: "matchPercentage",
    header: "Match %",
    cell: ({ row }) => {
      const pct = parseFloat(row.getValue("matchPercentage"));
      return <span className={pct > 99 ? "text-green-600 font-medium" : pct > 90 ? "text-gray-900 font-medium" : "text-amber-600 font-medium"}>{row.getValue("matchPercentage")}</span>;
    }
  },
  {
    accessorKey: "createdBy",
    header: "Created By",
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
  },
];

export function RunsTableClient({ initialData }: { initialData: RunRow[] }) {
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
              placeholder="Search Run ID, Creator, Period..." 
              className="pl-9 h-9"
              aria-label="Search reconciliation runs"
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
              All Runs (24)
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-gray-500 hover:text-gray-900">
              Needs Attention (3)
            </Button>
          </div>
        </div>

      </div>

      <div className="p-4 flex-1 overflow-auto">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <Inbox className="h-12 w-12 text-gray-300 mb-4" aria-hidden="true" />
            <h2 className="text-lg font-medium text-gray-900 mb-1">No reconciliation runs found</h2>
            <p className="text-sm text-gray-500 mb-6">No runs have been executed in this workspace yet.</p>
            <Button variant="outline" size="sm">
              <Play className="mr-2 h-4 w-4" aria-hidden="true" />
              Trigger Run
            </Button>
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={data.filter(row => 
              row.id.toLowerCase().includes(globalFilter.toLowerCase()) || 
              row.createdBy.toLowerCase().includes(globalFilter.toLowerCase()) ||
              row.period.toLowerCase().includes(globalFilter.toLowerCase())
            )} 
            isServerSide={false} 
          />
        )}
      </div>
    </div>
  );
}
