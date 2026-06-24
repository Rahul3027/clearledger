"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavSectionProps {
  title: string;
  items: NavItem[];
  collapsed: boolean;
}

export function NavSection({ title, items, collapsed }: NavSectionProps) {
  const pathname = usePathname();

  return (
    <div className="mb-6">
      {!collapsed && (
        <h3 className="px-3 text-xs font-semibold text-gray-500 tracking-wider mb-2">
          {title}
        </h3>
      )}
      <div className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon
                className={cn(
                  "shrink-0",
                  collapsed ? "h-5 w-5" : "mr-3 h-4 w-4",
                  isActive ? "text-blue-700" : "text-gray-400 group-hover:text-gray-600"
                )}
              />
              {!collapsed && item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
