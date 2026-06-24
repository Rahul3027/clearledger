/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
"use client";

import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, Search, Activity, Link as LinkIcon, Check } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { cn } from "@/lib/utils";

// --- Types ---
export type SyncHistoryRow = {
  id: string;
  startedAt: string;
  completedAt: string;
  status: "Success" | "Failed" | "Running";
  records: number;
  duration: string;
};

export type WebhookEventRow = {
  id: string;
  type: string;
  status: "Processed" | "Dropped" | "Pending";
  receivedAt: string;
};

// --- Tables Columns ---
const syncColumns: ColumnDef<SyncHistoryRow>[] = [
  { accessorKey: "id", header: "Sync ID", cell: ({ row }) => <span className="text-gray-900 font-medium">{row.getValue("id")}</span> },
  { accessorKey: "startedAt", header: "Started At" },
  { accessorKey: "completedAt", header: "Completed At" },
  { accessorKey: "status", header: "Status", cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variantMap: Record<string, "success" | "warning" | "destructive"> = { Success: "success", Running: "warning", Failed: "destructive" };
      return <StatusBadge variant={variantMap[status] || "neutral"}>{status}</StatusBadge>;
  }},
  { accessorKey: "records", header: "Records" },
  { accessorKey: "duration", header: "Duration" },
];

const webhookColumns: ColumnDef<WebhookEventRow>[] = [
  { accessorKey: "id", header: "Event ID", cell: ({ row }) => <span className="text-gray-900 font-medium">{row.getValue("id")}</span> },
  { accessorKey: "type", header: "Event Type" },
  { accessorKey: "status", header: "Status", cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variantMap: Record<string, "success" | "warning" | "destructive" | "neutral"> = { Processed: "success", Dropped: "destructive", Pending: "neutral" };
      return <StatusBadge variant={variantMap[status] || "neutral"}>{status}</StatusBadge>;
  }},
  { accessorKey: "receivedAt", header: "Received At" },
];

// --- Client Component ---
export function ConnectorDetailClient({ syncHistory, webhooks }: { syncHistory: SyncHistoryRow[], webhooks: WebhookEventRow[] }) {
  const [activeTab, setActiveTab] = useState<"syncs" | "webhooks">("syncs");

  return (
    <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden relative">
      
      {/* Tabs */}
      <div className="flex items-center border-b border-gray-200 px-2 shrink-0 bg-gray-50">
        <button 
          onClick={() => setActiveTab("syncs")}
          className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === "syncs" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700")}
        >
          Sync History
        </button>
        <button 
          onClick={() => setActiveTab("webhooks")}
          className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === "webhooks" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700")}
        >
          Webhook Events
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 overflow-auto">
        {activeTab === "syncs" ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="relative w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
                <Input type="search" placeholder="Search Sync ID..." className="pl-9 h-9" aria-label="Search sync history" />
              </div>
              <Button variant="outline" size="sm" className="h-9"><Filter className="mr-2 h-4 w-4" /> Filter</Button>
            </div>
            {syncHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Activity className="h-10 w-10 text-gray-300 mb-3" />
                <h2 className="text-lg font-medium text-gray-900 mb-1">No sync activity</h2>
                <p className="text-sm text-gray-500">This connector has not executed any syncs yet.</p>
              </div>
            ) : (
              <DataTable columns={syncColumns} data={syncHistory} isServerSide={false} />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="relative w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
                <Input type="search" placeholder="Search Event ID, Type..." className="pl-9 h-9" aria-label="Search webhook events" />
              </div>
              <Button variant="outline" size="sm" className="h-9"><Filter className="mr-2 h-4 w-4" /> Filter</Button>
            </div>
            {webhooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <LinkIcon className="h-10 w-10 text-gray-300 mb-3" />
                <h2 className="text-lg font-medium text-gray-900 mb-1">No webhook events received</h2>
                <p className="text-sm text-gray-500">Events will appear here when pushed from the source.</p>
              </div>
            ) : (
              <DataTable columns={webhookColumns} data={webhooks} isServerSide={false} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
