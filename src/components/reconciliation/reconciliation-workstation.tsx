/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
"use client";

import { useState, useMemo } from "react";
import { 
  Search, 
  Filter, 
  HelpCircle, 
  MessageSquare, 
  FileText, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  AlertTriangle,
  ArrowRight,
  Send,
  User,
  Paperclip
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

export interface ReconciliationItem {
  invoiceNumber: string;
  supplier: string;
  customer: string;
  invoiceDate: string;
  netAmount: string;
  vatAmount: string;
  grossAmount: string;
  vatDifference: string;
  confidence: string;
  status: string;
  sourceSystem: string;
  details: {
    platformId: string;
    stableIdentityKey: string;
    currencyCode: string;
    exchangeRate: string;
    accountCode: string | null;
    peppolSigStatus: string | null;
    ingestedAt: string;
    ingestedBy: string;
  };
  matchedCandidate: {
    platformId: string;
    invoiceNumber: string;
    netAmount: string;
    vatAmount: string;
    grossAmount: string;
    sourceSystem: string;
  } | null;
  matchingExplanation: string;
  comments: Array<{ author: string; text: string; date: string }>;
  auditEvents: Array<{ action: string; actor: string; date: string }>;
}

interface WorkstationProps {
  initialData: ReconciliationItem[];
}

export function ReconciliationWorkstation({ initialData }: WorkstationProps) {
  const [data, setData] = useState<ReconciliationItem[]>(initialData);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialData.length > 0 ? initialData[0].details.platformId : null
  );

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [confidenceFilter, setConfidenceFilter] = useState<string[]>([]);
  const [supplierFilter, setSupplierFilter] = useState<string[]>([]);
  
  // Local comments state (mapped by platformId)
  const [localComments, setLocalComments] = useState<Record<string, Array<{ author: string; text: string; date: string }>>>({});
  const [newCommentText, setNewCommentText] = useState("");

  const selectedItem = useMemo(() => {
    return data.find(item => item.details.platformId === selectedId) || null;
  }, [data, selectedId]);

  // Derived filter options
  const suppliers = useMemo(() => {
    const set = new Set<string>();
    data.forEach(item => {
      if (item.supplier && item.supplier !== "N/A") set.add(item.supplier);
    });
    return Array.from(set);
  }, [data]);

  // Apply filters
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // 1. Search Query
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          item.invoiceNumber.toLowerCase().includes(query) ||
          item.supplier.toLowerCase().includes(query) ||
          item.customer.toLowerCase().includes(query) ||
          item.details.platformId.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // 2. Status Filter
      if (statusFilter.length > 0 && !statusFilter.includes(item.status)) {
        return false;
      }

      // 3. Confidence Filter
      if (confidenceFilter.length > 0) {
        const conf = Number(item.confidence);
        const matchesConf = confidenceFilter.some(filter => {
          if (filter === "high" && conf >= 0.9) return true;
          if (filter === "medium" && conf >= 0.7 && conf < 0.9) return true;
          if (filter === "low" && conf < 0.7) return true;
          return false;
        });
        if (!matchesConf) return false;
      }

      // 4. Supplier Filter
      if (supplierFilter.length > 0 && !supplierFilter.includes(item.supplier)) {
        return false;
      }

      return true;
    });
  }, [data, searchQuery, statusFilter, confidenceFilter, supplierFilter]);

  const handleStatusToggle = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const handleConfidenceToggle = (level: string) => {
    setConfidenceFilter(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const handleSupplierToggle = (supplier: string) => {
    setSupplierFilter(prev =>
      prev.includes(supplier) ? prev.filter(s => s !== supplier) : [...prev, supplier]
    );
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || newCommentText.trim() === "") return;

    const newComment = {
      author: "VAT Accountant",
      text: newCommentText,
      date: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    };

    setLocalComments(prev => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), newComment]
    }));
    setNewCommentText("");
  };

  const activeComments = useMemo(() => {
    if (!selectedId) return [];
    const baseComments = selectedItem?.comments || [];
    const customComments = localComments[selectedId] || [];
    return [...baseComments, ...customComments];
  }, [selectedId, selectedItem, localComments]);

  return (
    <div className="flex border border-slate-200 rounded-lg overflow-hidden h-[calc(100vh-12rem)] bg-white text-xs select-none">
      
      {/* LEFT PANEL: FILTERS */}
      <div className="w-56 border-r border-slate-200 bg-slate-50/50 p-4 flex flex-col gap-4 overflow-y-auto shrink-0 select-none">
        <div>
          <h3 className="font-bold text-slate-800 uppercase tracking-wider mb-2 text-[10px]">Recon Status</h3>
          <div className="space-y-1.5 font-medium text-slate-600">
            {["MATCHED", "MATCHED_WITH_TOLERANCE", "UNMATCHED", "MANUAL_MATCH", "AMBIGUOUS"].map(status => (
              <label key={status} className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                <input 
                  type="checkbox"
                  checked={statusFilter.includes(status)}
                  onChange={() => handleStatusToggle(status)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 h-3.5 w-3.5"
                />
                <span className="truncate">{status.replace(/_/g, " ")}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-3">
          <h3 className="font-bold text-slate-800 uppercase tracking-wider mb-2 text-[10px]">Confidence Range</h3>
          <div className="space-y-1.5 font-medium text-slate-600">
            {[
              { id: "high", label: "High (≥ 90%)" },
              { id: "medium", label: "Medium (70% - 89%)" },
              { id: "low", label: "Low (< 70%)" }
            ].map(lvl => (
              <label key={lvl.id} className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                <input 
                  type="checkbox"
                  checked={confidenceFilter.includes(lvl.id)}
                  onChange={() => handleConfidenceToggle(lvl.id)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 h-3.5 w-3.5"
                />
                <span>{lvl.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-3">
          <h3 className="font-bold text-slate-800 uppercase tracking-wider mb-2 text-[10px]">Suppliers</h3>
          <div className="space-y-1.5 font-medium text-slate-600 max-h-40 overflow-y-auto">
            {suppliers.length > 0 ? suppliers.map(sup => (
              <label key={sup} className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                <input 
                  type="checkbox"
                  checked={supplierFilter.includes(sup)}
                  onChange={() => handleSupplierToggle(sup)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 h-3.5 w-3.5"
                />
                <span className="truncate">{sup}</span>
              </label>
            )) : <span className="text-slate-400 italic">No suppliers found</span>}
          </div>
        </div>
      </div>

      {/* CENTER PANEL: HIGH-DENSITY TABLE */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        {/* Table Search Header */}
        <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center gap-3 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input 
              type="search"
              placeholder="Search invoice, customer, supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-full rounded-md border border-slate-200 focus:border-slate-800 focus:ring-slate-800 bg-white"
            />
          </div>
          <span className="font-semibold text-slate-500">
            Showing {filteredData.length} of {data.length} transactions
          </span>
        </div>

        {/* Scrollable table container */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/20 uppercase tracking-wider text-[10px] sticky top-0 bg-white z-10">
                <th className="py-2 px-3">Invoice Number</th>
                <th className="py-2 px-3">Supplier</th>
                <th className="py-2 px-3">Customer</th>
                <th className="py-2 px-3">Invoice Date</th>
                <th className="py-2 px-3 text-right">Net</th>
                <th className="py-2 px-3 text-right">VAT</th>
                <th className="py-2 px-3 text-right">Gross</th>
                <th className="py-2 px-3 text-right">VAT Diff</th>
                <th className="py-2 px-3 text-center">Confidence</th>
                <th className="py-2 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredData.map((item) => {
                const isSelected = item.details.platformId === selectedId;
                return (
                  <tr 
                    key={item.details.platformId}
                    onClick={() => setSelectedId(item.details.platformId)}
                    className={`cursor-pointer hover:bg-slate-50/50 ${
                      isSelected ? "bg-slate-50 border-y border-slate-300/50" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{item.invoiceNumber}</td>
                    <td className="py-2.5 px-3 truncate max-w-[120px]">{item.supplier}</td>
                    <td className="py-2.5 px-3 truncate max-w-[120px]">{item.customer}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{item.invoiceDate}</td>
                    <td className="py-2.5 px-3 text-right">£{Number(item.netAmount).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right">£{Number(item.vatAmount).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">£{Number(item.grossAmount).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-red-600">
                      {Number(item.vatDifference) !== 0 ? `£${Number(item.vatDifference).toFixed(2)}` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold">
                      {(Number(item.confidence) * 100).toFixed(0)}%
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <StatusBadge variant={
                        item.status === "MATCHED" ? "success" : 
                        item.status === "MATCHED_WITH_TOLERANCE" ? "success" :
                        item.status === "UNMATCHED" ? "destructive" : "warning"
                      }>
                        {item.status}
                      </StatusBadge>
                    </td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400 italic">
                    No transactions match current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT PANEL: PERSISTENT INSPECTOR */}
      <div className="w-80 border-l border-slate-200 flex flex-col overflow-y-auto shrink-0 bg-white select-none">
        {selectedItem ? (
          <div className="flex flex-col h-full">
            {/* Inspector Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">VAT Inspector</span>
              <h2 className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-slate-500" />
                Invoice {selectedItem.invoiceNumber}
              </h2>
            </div>

            {/* Content Sections */}
            <div className="flex-1 p-4 space-y-4">
              {/* Core Details */}
              <div className="space-y-1.5 border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[9px] mb-2">Invoice Details</h3>
                <div className="grid grid-cols-2 gap-y-2 text-[11px] font-semibold text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[9px] font-bold uppercase">Platform ID</span>
                    <span className="font-mono text-slate-600 text-[10px]">{selectedItem.details.platformId.substring(0, 8)}...</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] font-bold uppercase">Identity Key</span>
                    <span className="font-mono text-slate-600 text-[10px]">{selectedItem.details.stableIdentityKey.substring(0, 8)}...</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] font-bold uppercase">Currency</span>
                    <span>{selectedItem.details.currencyCode} (x{Number(selectedItem.details.exchangeRate).toFixed(2)})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] font-bold uppercase">PEPPOL Signature</span>
                    <span className="font-semibold text-slate-800">{selectedItem.details.peppolSigStatus || "N/A"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[9px] font-bold uppercase">Ingested</span>
                    <span>{new Date(selectedItem.details.ingestedAt).toLocaleString()} by {selectedItem.details.ingestedBy}</span>
                  </div>
                </div>
              </div>

              {/* Match Candidate Details */}
              {selectedItem.matchedCandidate ? (
                <div className="border border-slate-200 bg-slate-50/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Matched Transaction Candidate</span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span className="font-semibold">Match ID:</span>
                      <span className="font-mono">{selectedItem.matchedCandidate.platformId.substring(0, 8)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Invoice No:</span>
                      <span>{selectedItem.matchedCandidate.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Gross Match:</span>
                      <span className="font-bold text-slate-900">£{Number(selectedItem.matchedCandidate.grossAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Source System:</span>
                      <span>{selectedItem.matchedCandidate.sourceSystem}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-red-200 bg-red-50/20 rounded-lg p-3 text-[11px] text-red-800 font-semibold flex items-start gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">No Matching Candidate</p>
                    <p className="mt-1 font-normal text-red-700 leading-relaxed">DQE and Reconciliation engines failed to align a counterpart invoice within standard matching tolerances.</p>
                  </div>
                </div>
              )}

              {/* Matching Explanation & Confidence */}
              <div className="space-y-1.5 border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[9px] mb-1">Matching Explanation</h3>
                <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                  {selectedItem.matchingExplanation}
                </p>
                <div className="mt-2.5 flex items-center justify-between p-2 bg-slate-50 rounded-md">
                  <span className="font-bold text-slate-500">Confidence Metric Breakdown:</span>
                  <span className="font-bold text-slate-900">{(Number(selectedItem.confidence) * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Attachments */}
              <div className="space-y-1.5 border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[9px] mb-2">Transaction Attachments</h3>
                <div className="border border-slate-200 border-dashed rounded-lg p-3 text-center text-slate-400 hover:bg-slate-50 cursor-pointer">
                  <Paperclip className="h-4 w-4 mx-auto mb-1 text-slate-500" />
                  <span className="font-bold block text-[10px]">Attach Verification Proof</span>
                  <span className="text-[9px] font-medium block">PDF, PNG (Max 10MB)</span>
                </div>
              </div>

              {/* Activity Feed / Comment Timeline */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[9px]">Activity & Comments</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {activeComments.map((comment, index) => (
                    <div key={index} className="bg-slate-50 border border-slate-100 rounded-md p-2">
                      <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                        <span>{comment.author}</span>
                        <span>{comment.date}</span>
                      </div>
                      <p className="text-[10px] text-slate-700 font-semibold mt-1 leading-normal">{comment.text}</p>
                    </div>
                  ))}
                  {activeComments.length === 0 && (
                    <p className="text-slate-400 italic text-[10px] text-center py-2">No activities logged. Add a comment below.</p>
                  )}
                </div>

                {/* Comment Form */}
                <form onSubmit={handleAddComment} className="flex gap-1.5 mt-2">
                  <input 
                    type="text"
                    placeholder="Type comments..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 rounded-md border border-slate-200 py-1 px-2.5 text-[10px] focus:outline-none focus:border-slate-800 bg-white"
                  />
                  <Button type="submit" size="sm" className="bg-slate-900 hover:bg-slate-800 text-white p-1.5 h-7 w-7 flex items-center justify-center shrink-0">
                    <Send className="h-3 w-3 fill-current" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center">
            <HelpCircle className="h-8 w-8 text-slate-300 mb-2" />
            <span className="font-bold">Select transaction to inspect</span>
            <span className="text-[10px] font-medium leading-relaxed mt-1">Click any invoice row in the central reconciliation workspace to review match integrity.</span>
          </div>
        )}
      </div>

    </div>
  );
}
