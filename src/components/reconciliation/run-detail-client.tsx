/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
"use client";

import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, Search, Link as LinkIcon, Plus, X, ChevronRight, Check, Eye } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { FocusTrap } from "@/components/ui/focus-trap";

// --- Types ---
export type MatchResultRow = {
  id: string;
  sourceDoc: string;
  counterparty: string;
  amount: string;
  matchType: "Exact" | "Tolerance" | "Manual" | "Unmatched";
  confidence: number;
  status: "Matched" | "Partial" | "Unmatched";
};

export type UnmatchedRow = {
  id: string;
  amount: string;
  date: string;
  counterparty: string;
  suggestedMatch: string | null;
};

// --- Tables Columns ---
const matchColumns: ColumnDef<MatchResultRow>[] = [
  { accessorKey: "id", header: "Transaction ID", cell: ({ row }) => <span className="text-gray-900 font-medium">{row.getValue("id")}</span> },
  { accessorKey: "sourceDoc", header: "Source Document" },
  { accessorKey: "counterparty", header: "Counterparty" },
  { accessorKey: "amount", header: "Amount", cell: ({ row }) => <span className="font-medium text-gray-900">{row.getValue("amount")}</span> },
  { accessorKey: "matchType", header: "Match Type", cell: ({ row }) => <span className="text-gray-600">{row.getValue("matchType")}</span> },
  { accessorKey: "confidence", header: "Confidence", cell: ({ row }) => {
      const conf = row.getValue("confidence") as number;
      return <span className={conf > 0.9 ? "text-green-600 font-medium" : conf > 0.7 ? "text-amber-600 font-medium" : "text-gray-500"}>{(conf * 100).toFixed(1)}%</span>;
  }},
  { accessorKey: "status", header: "Status", cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variantMap: Record<string, "success" | "warning" | "destructive"> = { Matched: "success", Partial: "warning", Unmatched: "destructive" };
      return <StatusBadge variant={variantMap[status] || "neutral"}>{status}</StatusBadge>;
  }},
];

// --- Client Component ---
export function RunDetailClient({ matchResults, unmatched }: { matchResults: MatchResultRow[], unmatched: UnmatchedRow[] }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUnmatched, setSelectedUnmatched] = useState<UnmatchedRow | null>(null);
  const [activeTab, setActiveTab] = useState<"results" | "unmatched">("unmatched");
  const drawerRef = useRef<HTMLDivElement>(null);

  const openDrawer = (row: UnmatchedRow) => {
    setSelectedUnmatched(row);
    setDrawerOpen(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawerOpen) {
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  const unmatchedColumns: ColumnDef<UnmatchedRow>[] = [
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => <span className="font-medium text-red-600">{row.getValue("amount")}</span> },
    { accessorKey: "date", header: "Date" },
    { accessorKey: "counterparty", header: "Counterparty", cell: ({ row }) => <span className="font-medium text-gray-900">{row.getValue("counterparty")}</span> },
    { accessorKey: "suggestedMatch", header: "Suggested Match", cell: ({ row }) => {
        const sm = row.getValue("suggestedMatch") as string;
        return sm ? <span className="text-blue-600 font-medium">{sm}</span> : <span className="text-gray-400 italic">None</span>;
    }},
    { id: "actions", header: "Actions", cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.suggestedMatch && (
            <Button variant="outline" size="sm" className="h-7 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800">
              <Eye className="mr-1 h-3 w-3" /> View Candidate
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openDrawer(row.original)}>
            <LinkIcon className="mr-1 h-3 w-3" /> Manual Match
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50">
            <Plus className="mr-1 h-3 w-3" /> Create Exception
          </Button>
        </div>
    )}
  ];

  return (
    <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden relative">
      
      {/* Tabs */}
      <div className="flex items-center border-b border-gray-200 px-2 shrink-0 bg-gray-50">
        <button 
          onClick={() => setActiveTab("unmatched")}
          className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === "unmatched" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700")}
        >
          Unmatched Transactions ({unmatched.length})
        </button>
        <button 
          onClick={() => setActiveTab("results")}
          className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === "results" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700")}
        >
          Match Results ({matchResults.length})
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 overflow-auto">
        {activeTab === "results" ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="relative w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
                <Input type="search" placeholder="Search ID, Counterparty..." className="pl-9 h-9" aria-label="Search match results" />
              </div>
              <Button variant="outline" size="sm" className="h-9"><Filter className="mr-2 h-4 w-4" /> Filter</Button>
            </div>
            {matchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center"><h2 className="text-sm font-medium text-gray-900">No match results</h2></div>
            ) : (
              <DataTable columns={matchColumns} data={matchResults} isServerSide={false} />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="relative w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
                <Input type="search" placeholder="Search Unmatched Transactions..." className="pl-9 h-9" aria-label="Search unmatched" />
              </div>
            </div>
            {unmatched.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Check className="h-10 w-10 text-green-500 mb-3" />
                <h2 className="text-lg font-medium text-gray-900 mb-1">All transactions matched successfully</h2>
                <p className="text-sm text-gray-500">No manual intervention required.</p>
              </div>
            ) : (
              <DataTable columns={unmatchedColumns} data={unmatched} isServerSide={false} />
            )}
          </div>
        )}
      </div>

      {/* Manual Match Drawer Overlay */}
      {drawerOpen && (
        <FocusTrap isActive={drawerOpen} onEscape={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 z-50 flex justify-end overflow-hidden" aria-modal="true" role="dialog">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
            
            {/* Drawer Panel */}
          <div 
            ref={drawerRef}
            className="w-[800px] bg-white h-full shadow-2xl relative z-10 flex flex-col border-l border-gray-200"
            role="document"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Manual Match Investigation</h2>
              <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)} aria-label="Close drawer" className="h-8 w-8 text-gray-500">
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            {/* Drawer Body (Split Left/Right) */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left: Source Record */}
              <div className="w-1/2 border-r border-gray-200 p-6 overflow-y-auto bg-[#FAFAFA]">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Target Transaction</h3>
                {selectedUnmatched && (
                  <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-gray-500">Amount</span>
                      <span className="text-lg font-bold text-red-600">{selectedUnmatched.amount}</span>
                    </div>
                    <div className="flex justify-between items-start border-t border-gray-50 pt-2">
                      <span className="text-xs text-gray-500">Date</span>
                      <span className="text-sm font-medium text-gray-900">{selectedUnmatched.date}</span>
                    </div>
                    <div className="flex justify-between items-start border-t border-gray-50 pt-2">
                      <span className="text-xs text-gray-500">Counterparty</span>
                      <span className="text-sm font-medium text-gray-900">{selectedUnmatched.counterparty}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Candidates */}
              <div className="w-1/2 p-6 overflow-y-auto bg-white flex flex-col">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Matching Candidates</h3>
                
                {selectedUnmatched?.suggestedMatch ? (
                  <div className="space-y-4 flex-1">
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 hover:border-blue-400 cursor-pointer transition-colors group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Suggested Match</span>
                        <span className="text-xs font-bold text-green-600">92% Confidence</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs text-gray-500">Amount</span>
                        <span className="text-base font-bold text-gray-900">$4,250.00</span>
                      </div>
                      <div className="flex justify-between items-start border-t border-blue-100/50 pt-2 mt-2">
                        <span className="text-xs text-gray-500">Source Doc</span>
                        <span className="text-sm font-medium text-gray-900">{selectedUnmatched.suggestedMatch}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-70">
                    <Search className="h-8 w-8 text-gray-300 mb-3" aria-hidden="true" />
                    <h4 className="text-sm font-medium text-gray-900">No candidates available</h4>
                    <p className="text-xs text-gray-500 mt-1">Try expanding the search parameters.</p>
                  </div>
                )}
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
              <div className="flex-1 mr-4">
                <Input placeholder="Add override justification note..." className="h-9 w-full bg-white" />
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shrink-0" disabled={!selectedUnmatched?.suggestedMatch}>
                <LinkIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                Link & Save Override
              </Button>
            </div>
          </div>
          </div>
        </FocusTrap>
      )}
    </div>
  );
}
