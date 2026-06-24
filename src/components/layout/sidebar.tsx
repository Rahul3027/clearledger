/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Database, 
  ArrowRightLeft, 
  AlertTriangle, 
  List, 
  UserCheck, 
  Briefcase, 
  CheckSquare, 
  Plug, 
  RefreshCw, 
  Globe, 
  Archive, 
  FileBarChart, 
  ScrollText, 
  Building, 
  Users, 
  Shield, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Boxes
} from "lucide-react";
import { useState } from "react";
import { NavSection } from "./nav-section";

const navigation = [
  {
    title: "OVERVIEW",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ]
  },
  {
    title: "OPERATIONS",
    items: [
      { name: "Ingestion", href: "/ingestion", icon: Database },
      { name: "Transactions", href: "/transactions", icon: List },
      { name: "Reconciliation", href: "/reconciliation", icon: ArrowRightLeft },
    ]
  },
  {
    title: "WORKFLOW",
    items: [
      { name: "Exceptions", href: "/exceptions", icon: AlertTriangle },
      { name: "Assignments", href: "/workflow/assignments", icon: UserCheck },
      { name: "Approvals", href: "/workflow/approvals", icon: CheckSquare },
    ]
  },
  {
    title: "INTEGRATIONS",
    items: [
      { name: "Connectors", href: "/integrations/connectors", icon: Plug },
      { name: "Sync Runs", href: "/integrations/sync-runs", icon: RefreshCw },
      { name: "Webhooks", href: "/integrations/webhooks", icon: Globe },
    ]
  },
  {
    title: "COMPLIANCE",
    items: [
      { name: "Evidence Packages", href: "/compliance/evidence", icon: Archive },
      { name: "Reports", href: "/compliance/reports", icon: FileBarChart },
      { name: "Audit Log", href: "/compliance/audit", icon: ScrollText },
    ]
  },
  {
    title: "ADMINISTRATION",
    items: [
      { name: "Users", href: "/settings/users", icon: Users },
      { name: "Roles", href: "/settings/roles", icon: Shield },
      { name: "Organization", href: "/settings/organization", icon: Building },
      { name: "Settings", href: "/settings", icon: Settings },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={cn(
      "flex flex-col bg-gray-50 border-r border-gray-200 transition-all duration-300 h-full",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Brand */}
      <div className="h-16 flex items-center px-4 border-b border-gray-200 shrink-0">
        <Boxes className="h-6 w-6 text-gray-900 shrink-0" />
        {!collapsed && <span className="ml-3 text-lg font-bold text-gray-900 tracking-tight">ClearLedger</span>}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-200">
        <nav className="px-3">
          {navigation.map((section) => (
            <NavSection 
              key={section.title}
              title={section.title}
              items={section.items}
              collapsed={collapsed}
            />
          ))}
        </nav>
      </div>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-gray-200 shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 mx-auto" aria-hidden="true" />
          ) : (
            <>
              <ChevronLeft className="mr-3 h-4 w-4" aria-hidden="true" />
              Collapse
            </>
          )}
        </button>
      </div>
    </div>
  );
}
