/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
"use client";

import { Button } from "@/components/ui/button";
import { Send, Paperclip, AtSign, Activity, MessageSquare } from "lucide-react";
import { useState, useRef, useEffect } from "react";

type ActivityEvent = {
  id: string;
  type: "SYSTEM" | "COMMENT";
  actor: string;
  initial?: string;
  time: string;
  content: string;
  icon?: React.ReactNode;
};

export function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([
    { id: "e1", type: "SYSTEM", actor: "System", time: "May 31, 2025 10:14 AM", content: "Case created and status set to OPEN" },
    { id: "e2", type: "SYSTEM", actor: "System", time: "May 31, 2025 10:15 AM", content: "Assigned to Sarah Jenkins based on routing rules" },
    { id: "e3", type: "COMMENT", actor: "Sarah Jenkins", initial: "SJ", time: "May 31, 2025 11:30 AM", content: "I've requested the updated invoice from the vendor. They should send it by EOD." },
    { id: "e4", type: "COMMENT", actor: "Alex Brown", initial: "AB", time: "May 31, 2025 12:00 PM", content: "Thanks Sarah. Let's keep this open until we receive it." },
  ]);

  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering when user is typing in another input
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      inputRef.current?.blur();
    }
  };

  const hasActivity = events.length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {!hasActivity ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <MessageSquare className="h-8 w-8 text-gray-300 mb-3" />
            <h3 className="text-sm font-medium text-gray-900">No activity recorded</h3>
            <p className="text-sm text-gray-500 mt-1">Use comments to collaborate on resolution.</p>
          </div>
        ) : (
          events.map((event, i) => {
            const isSystem = event.type === "SYSTEM";
            return (
              <div key={event.id} className="relative flex gap-4">
                {i !== events.length - 1 && (
                  <div className="absolute left-3.5 top-8 bottom-[-24px] w-px bg-gray-200" aria-hidden="true" />
                )}
                
                <div className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-1 ${isSystem ? 'bg-gray-100 ring-2 ring-white' : 'bg-blue-100 text-blue-700 text-xs font-semibold'}`}>
                  {isSystem ? <Activity className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" /> : event.initial}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{event.actor}</span>
                    <span className="text-xs text-gray-500">{event.time}</span>
                  </div>
                  {isSystem ? (
                    <p className="text-sm text-gray-600">{event.content}</p>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mt-1">
                      <p className="text-sm text-gray-800">{event.content}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-gray-200 shrink-0 bg-white">
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 shadow-sm transition-shadow">
          <textarea 
            ref={inputRef}
            className="w-full border-0 p-3 text-sm focus:ring-0 resize-none h-20 placeholder:text-gray-400" 
            placeholder="Type an internal note... (Press 'C' to focus)"
            aria-label="Add a comment"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors" aria-label="Mention someone">
                <AtSign className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors" aria-label="Attach file">
                <Paperclip className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <Button size="sm" className="h-7 text-xs font-medium px-3 shadow-sm" disabled={!input.trim()}>
              <Send className="mr-2 h-3 w-3" aria-hidden="true" />
              Comment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
