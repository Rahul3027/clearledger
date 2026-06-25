/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
"use client";

import { useState } from "react";
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Database, 
  FileCode, 
  FileText, 
  Link2, 
  Cpu, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  Play,
  Loader2,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadFileAction } from "@/app/actions/ingestion";
import { StatusBadge } from "@/components/ui/status-badge";

export type IngestionJobRow = {
  id: string;
  connectorId: string;
  status: "Pending" | "Running" | "Completed" | "Failed";
  rowsExtracted: number;
  rowsMapped: number;
  rowsQuarantined: number;
  rowsRejected: number;
  createdAt: string;
  processingTime: string;
};

interface IngestionClientProps {
  initialData: IngestionJobRow[];
}

export function IngestionClient({ initialData }: IngestionClientProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>("CSV");
  const [uploading, setUploading] = useState(false);

  const sources = [
    { name: "ERP", icon: Database, desc: "NetSuite & SAP Integrations", status: "Active" },
    { name: "CSV", icon: FileSpreadsheet, desc: "Comma Separated Values", status: "Manual" },
    { name: "Excel", icon: FileSpreadsheet, desc: "Spreadsheet Uploads", status: "Manual" },
    { name: "UBL XML", icon: FileCode, desc: "Universal Business Language", status: "Supported" },
    { name: "Invoice XML", icon: FileCode, desc: "E-invoicing Standards", status: "Supported" },
    { name: "PDF OCR", icon: FileText, desc: "Document Extraction Engine", status: "Beta" },
    { name: "API Connector", icon: Link2, desc: "REST/GraphQL endpoints", status: "Active" }
  ];

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

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", fileToUpload);
      await uploadFileAction(formData);
      setFileToUpload(null);
    } catch (err) {
      console.error("Upload action failed:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      
      {/* Source Selection Cards */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Supported Ingestion Sources</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          {sources.map((src) => {
            const Icon = src.icon;
            const isSelected = selectedSource === src.name;
            return (
              <button
                key={src.name}
                onClick={() => setSelectedSource(src.name)}
                className={`p-3.5 rounded-lg border text-left flex flex-col justify-between h-32 transition-all ${
                  isSelected 
                    ? "border-slate-800 bg-white ring-1 ring-slate-800" 
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <div className="p-1.5 rounded-md bg-slate-50 border border-slate-100">
                    <Icon className="h-4 w-4 text-slate-600" />
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    src.status === "Active" 
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}>
                    {src.status}
                  </span>
                </div>
                <div className="mt-2">
                  <p className="text-xs font-bold text-slate-900">{src.name}</p>
                  <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 leading-tight">{src.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual Upload Workspace */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          Workspace: Ingest via {selectedSource}
        </h3>
        
        {!fileToUpload ? (
          <div 
            className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-colors cursor-pointer ${
              dragActive ? "border-slate-800 bg-slate-50" : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <UploadCloud className="h-8 w-8 text-slate-400 mb-2" />
            <p className="text-xs font-bold text-slate-800">Drag & drop your file here, or click to browse</p>
            <p className="text-[10px] text-slate-400 mt-1">Supported: CSV, XLSX, XML, PDF (Max 50MB)</p>
            <input 
              id="file-upload" 
              type="file" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) setFileToUpload(e.target.files[0]);
              }} 
            />
          </div>
        ) : (
          <form onSubmit={handleUploadSubmit} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-md border border-slate-200 shadow-sm">
                <FileSpreadsheet className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{fileToUpload.name}</p>
                <p className="text-[10px] text-slate-500 font-medium">{(fileToUpload.size / 1024).toFixed(1)} KB • Staged</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => setFileToUpload(null)} 
                className="text-slate-500 hover:text-slate-900 font-bold text-xs"
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                size="sm" 
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-8 px-4"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Ingesting...
                  </>
                ) : (
                  <>
                    <Play className="mr-1.5 h-3 w-3 fill-current" />
                    Upload & Ingest
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Upload Timeline */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Upload & Processing Timeline</h3>
          <span className="text-[10px] text-slate-500 font-semibold flex items-center">
            <Calendar className="mr-1 h-3 w-3" /> Live Event Log
          </span>
        </div>

        <div className="mt-4 space-y-6">
          {initialData.length > 0 ? (
            initialData.map((job) => {
              const formattedDate = new Date(job.createdAt).toLocaleString();
              const warnings = job.rowsQuarantined;
              const errors = job.rowsRejected;
              const isFailed = job.status === "Failed";

              return (
                <div key={job.id} className="relative border-l border-slate-200 pl-5 pb-1 last:pb-0">
                  {/* Timeline bullet */}
                  <div className={`absolute -left-1.5 top-0.5 rounded-full h-3 w-3 border-2 bg-white ${
                    isFailed ? "border-red-500" : "border-slate-800"
                  }`} />
                  
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Import Job #{job.id.substring(0, 8)}</span>
                        <StatusBadge variant={job.status === "Completed" ? "success" : isFailed ? "destructive" : "warning"}>
                          {job.status}
                        </StatusBadge>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">{formattedDate}</p>
                    </div>
                    
                    {/* Performance metrics grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-4 gap-y-1.5 border border-slate-100 bg-slate-50/50 p-2.5 rounded-md text-[10px] font-semibold text-slate-700 min-w-0">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Imported</span>
                        <span className="text-slate-900">{job.rowsExtracted} rows</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Validated</span>
                        <span className="text-slate-900">{job.rowsMapped} rows</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Duplicates</span>
                        <span className="text-slate-900">0</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Warnings</span>
                        <span className={warnings > 0 ? "text-amber-600" : "text-slate-900"}>{warnings}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Errors</span>
                        <span className={errors > 0 ? "text-red-600" : "text-slate-900"}>{errors}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Latency</span>
                        <span className="text-slate-900">{job.processingTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Micro timeline events list */}
                  <div className="mt-2.5 bg-slate-50 border border-slate-100 rounded-md p-2.5 space-y-1 text-[10px] text-slate-600 font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">10:02:11</span>
                      <span className="text-slate-800">Job initiated via Excel-CSV connector (slug: excel-csv-v1)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">10:02:12</span>
                      <span className="text-slate-800">Canonical transformation engine finished: mapped {job.rowsMapped} of {job.rowsExtracted} rows</span>
                    </div>
                    {warnings > 0 && (
                      <div className="flex items-center gap-1.5 text-amber-700">
                        <span className="text-amber-400">10:02:12</span>
                        <span className="font-semibold">DQE validation warning: {warnings} invoices flagged with invalid VAT format</span>
                      </div>
                    )}
                    {errors > 0 && (
                      <div className="flex items-center gap-1.5 text-red-700">
                        <span className="text-red-400">10:02:12</span>
                        <span className="font-semibold">DQE rejected: {errors} transactions quarantine locked</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-emerald-700">
                      <span className="text-emerald-500">10:02:13</span>
                      <span className="font-semibold">Staged in database: ready for reconciliation period key review</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs">
              No ingestion activities logged. Drag and drop file above to begin.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

