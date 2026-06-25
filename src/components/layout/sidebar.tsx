/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  UploadCloud, 
  BadgeCheck, 
  Scale, 
  AlertCircle, 
  FileSpreadsheet, 
  BarChart3, 
  Archive, 
  Users, 
  Building, 
  Plug, 
  ScrollText, 
  Settings,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Boxes
} from "lucide-react";
import { useState } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(false);

  const mainNavigation = [
    {
      title: "OVERVIEW",
      items: [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      ]
    },
    {
      title: "OPERATIONS",
      items: [
        { name: "Import Center", href: "/ingestion", icon: UploadCloud },
        { name: "Data Validation", href: "/ingestion/validation", icon: BadgeCheck },
        { name: "VAT Reconciliation", href: "/reconciliation", icon: Scale },
        { name: "VAT Issues", href: "/exceptions", icon: AlertCircle },
      ]
    },
    {
      title: "COMPLIANCE",
      items: [
        { name: "VAT Returns", href: "/compliance", icon: FileSpreadsheet },
        { name: "Reports", href: "/reports", icon: BarChart3 },
        { name: "Evidence Packages", href: "/compliance/evidence-packages", icon: Archive },
      ]
    }
  ];

  const adminItems = [
    { name: "Console Settings", href: "/admin", icon: Settings },
  ];

  const renderLink = (item: any) => {
    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
    return (
      <Link
        key={item.name}
        href={item.href}
        className={cn(
          "group flex items-center px-3 py-2 text-xs font-semibold rounded-md transition-colors",
          isActive
            ? "bg-slate-100 text-slate-900 border border-slate-200"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent",
          collapsed && "justify-center px-0"
        )}
        title={collapsed ? item.name : undefined}
      >
        <item.icon
          className={cn(
            "shrink-0",
            collapsed ? "h-5 w-5" : "mr-2.5 h-4 w-4",
            isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
          )}
        />
        {!collapsed && <span>{item.name}</span>}
      </Link>
    );
  };

  return (
    <div className={cn(
      "flex flex-col bg-slate-50 border-r border-slate-200 transition-all duration-300 h-full select-none",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Brand Header */}
      <div className="h-14 flex items-center px-4 border-b border-slate-200 shrink-0">
        <Boxes className="h-5 w-5 text-slate-800 shrink-0" />
        {!collapsed && (
          <span className="ml-2.5 text-sm font-bold text-slate-950 tracking-tight">
            ClearLedger <span className="text-[10px] text-slate-400 font-medium ml-1">VAT</span>
          </span>
        )}
      </div>

      {/* Main Nav Items */}
      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-slate-200">
        <nav className="px-3 space-y-4">
          {mainNavigation.map((section) => (
            <div key={section.title} className="space-y-1">
              {!collapsed && (
                <h3 className="px-3 text-[10px] font-bold text-slate-400 tracking-wider mb-1.5 uppercase">
                  {section.title}
                </h3>
              )}
              <div className="space-y-0.5">
                {section.items.map(renderLink)}
              </div>
            </div>
          ))}

          {/* Administration Collapsible Section */}
          <div className="space-y-1 border-t border-slate-200 pt-3 mt-3">
            {!collapsed ? (
              <>
                <button
                  onClick={() => setAdminExpanded(!adminExpanded)}
                  className="flex items-center justify-between w-full px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-900 tracking-wider mb-1.5 uppercase focus:outline-none"
                >
                  <span>ADMINISTRATION</span>
                  {adminExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
                {adminExpanded && (
                  <div className="space-y-0.5 transition-all">
                    {adminItems.map(renderLink)}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-0.5">
                {adminItems.map(renderLink)}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-slate-200 shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center w-full px-3 py-1.5 text-xs font-semibold text-slate-500 rounded-md hover:bg-slate-100 transition-colors focus:outline-none"
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 mx-auto" />
          ) : (
            <>
              <ChevronLeft className="mr-2 h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
