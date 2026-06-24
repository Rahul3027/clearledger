/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
"use client";

import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, Search, UploadCloud, FileSpreadsheet, X } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";

export type IngestionJobRow = {
  id: string;
  source: string;
  fileName: string;
  status: "Pending" | "Running" | "Completed" | "Failed";
  recordsProcessed: number;
  dqeFailures: number;
  startedAt: string;
  completedAt: string;
};

const columns: ColumnDef<IngestionJobRow>[] = [
  { accessorKey: "id", header: "Job ID", cell: ({ row }) => <span className="text-gray-900 font-medium">{row.getValue("id")}</span> },
  { accessorKey: "source", header: "Source" },
  { accessorKey: "fileName", header: "File Name", cell: ({ row }) => (
    <div className="flex items-center gap-2">
      <FileSpreadsheet className="h-4 w-4 text-gray-400" aria-hidden="true" />
      <span className="font-medium text-blue-600">{row.getValue("fileName")}</span>
    </div>
  )},
  { accessorKey: "status", header: "Status", cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variantMap: Record<string, "success" | "warning" | "destructive" | "neutral"> = {
        Completed: "success", Running: "warning", Failed: "destructive", Pending: "neutral",
      };
      return <StatusBadge variant={variantMap[status] || "neutral"}>{status}</StatusBadge>;
  }},
  { accessorKey: "recordsProcessed", header: "Records Processed", cell: ({ row }) => <span className="text-gray-900 font-medium">{row.getValue("recordsProcessed")}</span> },
  { accessorKey: "dqeFailures", header: "DQE Failures", cell: ({ row }) => {
      const failures = row.getValue("dqeFailures") as number;
      return <span className={failures > 0 ? "text-red-600 font-medium" : "text-gray-500"}>{failures}</span>;
  }},
  { accessorKey: "startedAt", header: "Started At" },
  { accessorKey: "completedAt", header: "Completed At" },
];

export function IngestionClient({ initialData, pageCount }: { initialData: IngestionJobRow[], pageCount: number }) {
  const [data] = useState(initialData);
  const [globalFilter, setGlobalFilter] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const hasData = data.length > 0;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFileToUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-hidden">
      
      {/* Upload Zone */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 shrink-0">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Manual Import</h2>
        
        {!fileToUpload ? (
          <div 
            className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center transition-colors ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <UploadCloud className="h-10 w-10 text-gray-400 mb-3" aria-hidden="true" />
            <p className="text-sm font-medium text-gray-900">Drag and drop your file here</p>
            <p className="text-xs text-gray-500 mt-1 mb-4">Supported formats: CSV, XLSX (Max 50MB)</p>
            <Button variant="outline" size="sm" onClick={() => document.getElementById('file-upload')?.click()}>
              Browse Files
            </Button>
            <input id="file-upload" type="file" className="hidden" accept=".csv,.xlsx" onChange={(e) => {
              if (e.target.files && e.target.files[0]) setFileToUpload(e.target.files[0]);
            }} />
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-md border border-gray-200 shadow-sm">
                <FileSpreadsheet className="h-6 w-6 text-blue-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{fileToUpload.name}</p>
                <p className="text-xs text-gray-500">{(fileToUpload.size / 1024).toFixed(1)} KB • Just now</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setFileToUpload(null)} className="text-gray-500 hover:text-red-600">
                Cancel
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                Upload & Ingest
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Jobs Table */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">Ingestion Jobs</h2>
          <div className="flex items-center gap-3">
            <div className="relative w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
              <Input 
                type="search"
                placeholder="Search File Name, Job ID..." 
                className="pl-9 h-9"
                aria-label="Search ingestion jobs"
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
               <UploadCloud className="h-12 w-12 text-gray-300 mb-4" aria-hidden="true" />
               <h2 className="text-lg font-medium text-gray-900 mb-1">No ingestion jobs found</h2>
               <p className="text-sm text-gray-500 mb-6">Import data to begin the ingestion process.</p>
               <Button variant="outline" size="sm" onClick={() => document.getElementById('file-upload')?.click()}>
                 Upload a file
               </Button>
             </div>
          ) : (
            <DataTable 
              columns={columns} 
              data={data.filter(row => 
                row.fileName.toLowerCase().includes(globalFilter.toLowerCase()) || 
                row.id.toLowerCase().includes(globalFilter.toLowerCase())
              )} 
              isServerSide={false} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
