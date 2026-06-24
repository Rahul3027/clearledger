"use client";

import { Bell, Search, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";

import { OrgSwitcher } from "./org-switcher";

export function Topbar({ userEmail, orgId }: { userEmail: string; orgId: string }) {
  
  // Extract initials for the avatar (e.g. Alex Brown -> AB)
  const initials = userEmail
    .split('@')[0]
    .split('.')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'U';

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      
      {/* Left side: Org Switcher & Search Bar */}
      <div className="flex flex-1 items-center gap-6">
        <OrgSwitcher currentOrgId={orgId} />
        <div className="relative max-w-md w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </div>
          <Input
            type="search"
            placeholder="Search transactions, exceptions..."
            className="block w-full rounded-md border-gray-200 pl-10 sm:text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 h-9"
            aria-label="Search transactions and exceptions"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="text-gray-400 text-xs border border-gray-200 rounded px-1.5 py-0.5">⌘K</span>
          </div>
        </div>
      </div>

      {/* Right side tools */}
      <div className="flex items-center space-x-6">
        
        {/* Notifications */}
        <button 
          className="text-gray-400 hover:text-gray-500 relative"
          aria-label="Notifications"
        >
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
          <Bell className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="h-6 w-px bg-gray-200" />

        {/* User Profile */}
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-semibold text-gray-700">
            {initials}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900 leading-none">{userEmail.split('@')[0]}</p>
            <p className="text-xs text-gray-500 mt-1">{orgId}</p>
          </div>
        </div>

        {/* Logout */}
        <form action="/auth/logout" method="POST">
          <button
            type="submit"
            className="p-1.5 text-gray-400 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>

      </div>
    </header>
  );
}
