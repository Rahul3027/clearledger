"use client";

import { Check, ChevronsUpDown, Building } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

export function OrgSwitcher({ currentOrgId }: { currentOrgId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // In a real app, this would be fetched from the user's available memberships
  const organizations = [
    { id: currentOrgId, name: "Acme Corporation" },
    { id: "org_2", name: "Stark Industries" },
  ];

  const selected = organizations.find((o) => o.id === currentOrgId) || organizations[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(containerRef.current?.querySelectorAll('[role="menuitem"]') || []) as HTMLElement[];
    if (!items.length) return;
    const activeElement = document.activeElement as HTMLElement;
    const currentIndex = items.indexOf(activeElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      items[nextIndex].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      items[prevIndex].focus();
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="org-menu"
        aria-label="Select organization"
      >
        <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-gray-100 text-gray-600">
          <Building className="h-3 w-3" aria-hidden="true" />
        </div>
        <span className="truncate max-w-[120px]">{selected.name}</span>
        <ChevronsUpDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
      </button>

      {isOpen && (
        <div 
          id="org-menu"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="org-menu"
          className="absolute left-0 top-full mt-1 w-64 rounded-md border border-gray-200 bg-white shadow-lg z-50"
          onKeyDown={handleMenuKeyDown}
          // Automatically focus first item when opened (or use an effect, simplified for MVP)
          ref={(el) => { if (el) { const first = el.querySelector('[role="menuitem"]') as HTMLElement; if (first && document.activeElement === triggerRef.current) first.focus(); } }}
        >
          <div className="p-1">
            {organizations.map((org) => (
              <button
                key={org.id}
                role="menuitem"
                className={cn(
                  "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:bg-gray-100 focus:text-gray-900",
                  org.id === selected.id ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                )}
                onClick={() => {
                  setIsOpen(false);
                  triggerRef.current?.focus();
                  // Handle actual select logic here
                }}
              >
                {org.name}
                {org.id === selected.id && <Check className="h-4 w-4 text-gray-900" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
