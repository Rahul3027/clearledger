/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
"use client";

import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, Search, History, X, Code } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useState, useRef, useEffect } from "react";
import { FocusTrap } from "@/components/ui/focus-trap";

export type AuditEventRow = {
  id: string;
  timestamp: string;
  user: string;
  event: string;
  resourceType: string;
  resourceId: string;
  action: string;
  payload: string;
};

const columns: ColumnDef<AuditEventRow>[] = [
  { accessorKey: "timestamp", header: "Timestamp", cell: ({ row }) => <span className="text-gray-500 whitespace-nowrap">{row.getValue("timestamp")}</span> },
  { accessorKey: "user", header: "User", cell: ({ row }) => <span className="font-medium text-gray-900">{row.getValue("user")}</span> },
  { accessorKey: "event", header: "Event", cell: ({ row }) => <span className="font-mono text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{row.getValue("event")}</span> },
  { accessorKey: "resourceType", header: "Resource Type" },
  { accessorKey: "resourceId", header: "Resource ID", cell: ({ row }) => <span className="text-gray-600">{row.getValue("resourceId")}</span> },
  { accessorKey: "action", header: "Action" },
];

export function AuditLogClient({ initialData, pageCount }: { initialData: AuditEventRow[], pageCount: number }) {
  const [data] = useState(initialData);
  const [globalFilter, setGlobalFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AuditEventRow | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const hasData = data.length > 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawerOpen) {
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  // Use a custom row click handler for the DataTable
  const handleRowClick = (row: AuditEventRow) => {
    setSelectedEvent(row);
    setDrawerOpen(true);
  };

  // We wrap the standard DataTable to intercept row clicks. For now, since DataTable might not support onRowClick natively in our mock, we will render a modified version or just let the user click a button.
  // We'll add a 'View Payload' action column to trigger it safely.
  const tableColumns = [
    ...columns,
    {
      id: "actions",
      header: "Details",
      cell: ({ row }: any) => (
        <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600" onClick={() => handleRowClick(row.original)}>
          <Code className="h-3 w-3 mr-1" /> View JSON
        </Button>
      )
    }
  ];

  return (
    <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden relative">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
        <h2 className="text-sm font-semibold text-gray-900">Audit Events</h2>
        <div className="flex items-center gap-3">
          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <Input 
              type="search"
              placeholder="Search User, Event, Resource ID..." 
              className="pl-9 h-9"
              aria-label="Search audit log"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 border-gray-200 bg-white">
            <Filter className="mr-2 h-4 w-4 text-gray-500" aria-hidden="true" /> Date Range
          </Button>
          <Button variant="outline" size="sm" className="h-9 border-gray-200 bg-white">
            <Filter className="mr-2 h-4 w-4 text-gray-500" aria-hidden="true" /> Filter
          </Button>
        </div>
      </div>
      
      <div className="p-4 flex-1 overflow-auto">
        {!hasData ? (
           <div className="flex flex-col items-center justify-center h-full text-center py-20">
             <History className="h-12 w-12 text-gray-300 mb-4" aria-hidden="true" />
             <h2 className="text-lg font-medium text-gray-900 mb-1">No audit events found</h2>
             <p className="text-sm text-gray-500 mb-6">System and operator activity will be recorded here immutably.</p>
           </div>
        ) : (
          <DataTable 
            columns={tableColumns} 
            data={data.filter(row => 
              row.user.toLowerCase().includes(globalFilter.toLowerCase()) || 
              row.event.toLowerCase().includes(globalFilter.toLowerCase()) ||
              row.resourceId.toLowerCase().includes(globalFilter.toLowerCase())
            )} 
            isServerSide={false} 
          />
        )}
      </div>

      {/* Side Drawer for JSON Payload */}
      {drawerOpen && selectedEvent && (
        <FocusTrap isActive={drawerOpen} onEscape={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 z-50 flex justify-end overflow-hidden" aria-modal="true" role="dialog">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
            
            {/* Drawer Panel */}
          <div 
            ref={drawerRef}
            className="w-full md:w-[600px] bg-white h-full shadow-2xl relative z-10 flex flex-col border-l border-gray-200"
            role="document"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Event Details</h2>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{selectedEvent.id}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)} aria-label="Close drawer" className="h-8 w-8 text-gray-500">
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAFA]">
              
              <div className="grid grid-cols-2 gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Timestamp</p>
                  <p className="text-sm font-medium text-gray-900">{selectedEvent.timestamp}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">User</p>
                  <p className="text-sm font-medium text-gray-900">{selectedEvent.user}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Event</p>
                  <p className="font-mono text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 inline-block">{selectedEvent.event}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Resource</p>
                  <p className="text-sm font-medium text-gray-900">{selectedEvent.resourceType} ({selectedEvent.resourceId})</p>
                </div>
              </div>

              <h3 className="text-sm font-semibold text-gray-900 mb-3">Raw Event Payload</h3>
              <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 overflow-x-auto shadow-inner">
                <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap break-all">
                  {selectedEvent.payload}
                </pre>
              </div>

            </div>
          </div>
          </div>
        </FocusTrap>
      )}
    </div>
  );
}
