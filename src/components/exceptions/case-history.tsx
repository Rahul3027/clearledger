"use client";

import { Activity } from "lucide-react";

export function CaseHistory() {
  const events = [
    { id: 1, type: "CASE_CREATED", actor: "System", time: "May 31, 2025 10:14 AM" },
    { id: 2, type: "CASE_STATUS_CHANGED", actor: "System", details: "Status changed to OPEN", time: "May 31, 2025 10:14 AM" },
    { id: 3, type: "CASE_ASSIGNED", actor: "System", details: "Assigned to Sarah Jenkins based on routing rules", time: "May 31, 2025 10:15 AM" },
    { id: 4, type: "CASE_COMMENT_ADDED", actor: "Sarah Jenkins", time: "May 31, 2025 11:30 AM" },
  ];

  return (
    <div className="space-y-4">
      {events.map((event, i) => (
        <div key={event.id} className="relative flex gap-4">
          {i !== events.length - 1 && (
            <div className="absolute left-2.5 top-6 bottom-[-16px] w-px bg-gray-200" aria-hidden="true" />
          )}
          <div className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 ring-2 ring-white mt-0.5">
            <Activity className="h-3 w-3 text-gray-500" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {event.type.replace(/_/g, " ")}
            </p>
            {event.details && <p className="text-xs text-gray-600 mt-0.5">{event.details}</p>}
            <p className="text-xs text-gray-400 mt-1">{event.actor} • {event.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
