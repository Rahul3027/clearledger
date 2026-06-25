"use client";

import { Bell, LogOut, Building2, Calendar, Globe, Hash } from "lucide-react";
import { OrgSwitcher } from "./org-switcher";

export interface Entity {
  id: string;
  legalName: string;
  countryCode: string;
  taxRegNo: string | null;
}

interface TopbarProps {
  userEmail: string;
  orgId: string;
  entities?: Entity[];
  selectedEntityId?: string | null;
  selectedTaxPeriod?: string;
}

export function Topbar({ 
  userEmail, 
  orgId, 
  entities = [], 
  selectedEntityId, 
  selectedTaxPeriod = "2026-06" 
}: TopbarProps) {
  
  // Extract initials for the avatar
  const initials = userEmail
    .split('@')[0]
    .split('.')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'U';

  const activeEntity = entities.find(e => e.id === selectedEntityId) || entities[0];

  const handleEntityChange = (entityId: string) => {
    document.cookie = `selected_entity_id=${entityId}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  };

  const handlePeriodChange = (period: string) => {
    document.cookie = `selected_tax_period=${period}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  };

  // Generate recent tax periods for selection
  const taxPeriods = [
    { value: "2026-06", label: "Jun 2026" },
    { value: "2026-05", label: "May 2026" },
    { value: "2026-04", label: "Apr 2026" },
    { value: "2026-03", label: "Mar 2026" },
    { value: "2026-02", label: "Feb 2026" },
    { value: "2026-01", label: "Jan 2026" },
    { value: "2025-12", label: "Dec 2025" },
  ];

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-40">
      
      {/* Left side: Org Switcher & Global selectors */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <OrgSwitcher currentOrgId={orgId} />
        
        <div className="h-5 w-px bg-slate-200" />
        
        {/* Global Context Selectors */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
          {/* Legal Entity Selector */}
          <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800 shadow-sm shrink-0">
            <Building2 className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
            <select
              value={activeEntity?.id || ""}
              onChange={(e) => handleEntityChange(e.target.value)}
              className="bg-transparent border-0 p-0 text-xs font-semibold text-slate-900 focus:ring-0 focus:outline-none cursor-pointer"
              aria-label="Select Legal Entity"
            >
              {entities.length > 0 ? (
                entities.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.legalName}
                  </option>
                ))
              ) : (
                <option value="">Default Legal Entity</option>
              )}
            </select>
          </div>

          {/* VAT Registration Display/Selector */}
          <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800 shadow-sm shrink-0">
            <Hash className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
            <span className="text-slate-500 mr-1 select-none">VAT Reg:</span>
            <span className="font-semibold text-slate-900">
              {activeEntity?.taxRegNo || "GB123456789"}
            </span>
          </div>

          {/* Country Display/Selector */}
          <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800 shadow-sm shrink-0">
            <Globe className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
            <span className="text-slate-500 mr-1 select-none">Country:</span>
            <span className="font-semibold text-slate-900">
              {activeEntity?.countryCode || "GB"}
            </span>
          </div>

          {/* Tax Period Selector */}
          <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800 shadow-sm shrink-0">
            <Calendar className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
            <select
              value={selectedTaxPeriod}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="bg-transparent border-0 p-0 text-xs font-semibold text-slate-900 focus:ring-0 focus:outline-none cursor-pointer"
              aria-label="Select Tax Period"
            >
              {taxPeriods.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Right side tools */}
      <div className="flex items-center space-x-4 ml-4 shrink-0">
        
        {/* Notifications */}
        <button 
          className="text-slate-400 hover:text-slate-500 relative p-1.5 rounded-md hover:bg-slate-50 transition-colors"
          aria-label="Notifications"
        >
          <span className="absolute top-1 right-1 block h-1.5 w-1.5 rounded-full bg-blue-600 ring-2 ring-white" />
          <Bell className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="h-5 w-px bg-slate-200" />

        {/* User Profile */}
        <div className="flex items-center space-x-2">
          <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">
            {initials}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-semibold text-slate-900 leading-none">{userEmail.split('@')[0]}</p>
          </div>
        </div>

        {/* Logout */}
        <form action="/auth/logout" method="POST">
          <button
            type="submit"
            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-md hover:bg-slate-50 transition-colors"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>

      </div>
    </header>
  );
}

