/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, UserPlus, ShieldAlert, FileX } from "lucide-react";
import { useState, useEffect } from "react";

export function CaseActions({ currentStatus }: { currentStatus: string }) {
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      
      if ((e.key === "r" || e.key === "R") && currentStatus !== "RESOLVED" && currentStatus !== "CLOSED") {
        e.preventDefault();
        setIsResolving(true);
        // Simulate real resolution
        console.log("Resolved via hotkey");
      }
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        console.log("Assign via hotkey");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStatus]);

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="bg-white group" title="Shortcut: A">
        <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
        Assign
        <kbd className="ml-2 hidden lg:inline-flex items-center justify-center rounded border border-gray-200 bg-gray-50 px-1 text-[10px] font-medium text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">A</kbd>
      </Button>
      
      {currentStatus !== 'RESOLVED' && currentStatus !== 'CLOSED' && (
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-white text-green-700 hover:text-green-800 hover:bg-green-50 border-gray-200 group"
          onClick={() => setIsResolving(true)}
          title="Shortcut: R"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Resolve
          <kbd className="ml-2 hidden lg:inline-flex items-center justify-center rounded border border-green-200 bg-green-50 px-1 text-[10px] font-medium text-green-600 opacity-0 group-hover:opacity-100 transition-opacity">R</kbd>
        </Button>
      )}

      {currentStatus === 'RESOLVED' && (
        <Button variant="outline" size="sm" className="bg-white">
          <FileX className="mr-2 h-4 w-4" aria-hidden="true" />
          Close
        </Button>
      )}

      {(currentStatus === 'CLOSED' || currentStatus === 'RESOLVED') && (
        <Button variant="outline" size="sm" className="bg-white text-amber-700 hover:text-amber-800 hover:bg-amber-50">
          <ShieldAlert className="mr-2 h-4 w-4" aria-hidden="true" />
          Reopen
        </Button>
      )}
    </div>
  );
}
