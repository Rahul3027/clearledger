/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
"use client";

import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, Search, Link as LinkIcon, RefreshCw, PowerOff, Database } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useState } from "react";

export type ConnectorRow = {
  id: string;
  name: string;
  type: string;
  auth: "OAuth 2.0" | "API Key" | "Basic" | "Service Account";
  status: "Active" | "Disabled" | "Error";
  lastSync: string;
  failureCount: number;
  health: "Healthy" | "Warning" | "Down";
};

const columns: ColumnDef<ConnectorRow>[] = [
  { accessorKey: "name", header: "Connector Name", cell: ({ row }) => (
    <div className="flex items-center gap-2">
      <Database className="h-4 w-4 text-gray-400" aria-hidden="true" />
      <Link href={`/connectors/${row.original.id}`} className="font-medium text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-sm">
        {row.getValue("name")}
      </Link>
    </div>
  )},
  { accessorKey: "type", header: "Type" },
  { accessorKey: "auth", header: "Authentication" },
  { accessorKey: "status", header: "Status", cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const color = status === "Active" ? "text-green-700 bg-green-50 border-green-200" : status === "Error" ? "text-red-700 bg-red-50 border-red-200" : "text-gray-700 bg-gray-50 border-gray-200";
      return <span className={`px-2 py-0.5 rounded text-xs font-medium border ${color}`}>{status}</span>;
  }},
  { accessorKey: "lastSync", header: "Last Sync" },
  { accessorKey: "failureCount", header: "Failures", cell: ({ row }) => {
      const count = row.getValue("failureCount") as number;
      return <span className={count > 0 ? "text-red-600 font-medium" : "text-gray-500"}>{count}</span>;
  }},
  { accessorKey: "health", header: "Health", cell: ({ row }) => {
      const health = row.getValue("health") as string;
      const color = health === "Healthy" ? "bg-green-500" : health === "Warning" ? "bg-amber-400" : "bg-red-500";
      return <div className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${color}`} /><span className="text-sm text-gray-700 font-medium">{health}</span></div>;
  }},
  { id: "actions", header: "Actions", cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs">
          <RefreshCw className="mr-1 h-3 w-3" aria-hidden="true" /> Sync
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
          <PowerOff className="mr-1 h-3 w-3" aria-hidden="true" /> Disable
        </Button>
      </div>
  )},
];

export function ConnectorsClient({ initialData }: { initialData: ConnectorRow[] }) {
  const [data] = useState(initialData);
  const [globalFilter, setGlobalFilter] = useState("");

  const hasData = data.length > 0;

  return (
    <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
        <h2 className="text-sm font-semibold text-gray-900">Configured Connectors</h2>
        <div className="flex items-center gap-3">
          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <Input 
              type="search"
              placeholder="Search Connectors..." 
              className="pl-9 h-9"
              aria-label="Search connectors"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 border-gray-200 bg-white">
            <Filter className="mr-2 h-4 w-4 text-gray-500" aria-hidden="true" /> Filter
          </Button>
        </div>
      </div>
      
      <div className="p-4 flex-1 overflow-auto">
        {!hasData ? (
           <div className="flex flex-col items-center justify-center h-full text-center py-20">
             <LinkIcon className="h-12 w-12 text-gray-300 mb-4" aria-hidden="true" />
             <h2 className="text-lg font-medium text-gray-900 mb-1">No connectors configured</h2>
             <p className="text-sm text-gray-500 mb-6">Connect your financial systems to automate ingestion.</p>
             <Button className="bg-blue-600 hover:bg-blue-700 text-white">
               Add Connector
             </Button>
           </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={data.filter(row => 
              row.name.toLowerCase().includes(globalFilter.toLowerCase()) || 
              row.type.toLowerCase().includes(globalFilter.toLowerCase())
            )} 
            isServerSide={false} 
          />
        )}
      </div>
    </div>
  );
}
