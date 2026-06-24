"use client";

import { Button } from "@/components/ui/button";
import { Send, Paperclip, AtSign } from "lucide-react";

export function CommentsThread() {
  const comments = [
    { id: 1, author: "Sarah Jenkins", initial: "SJ", time: "2 hours ago", content: "I've requested the updated invoice from the vendor. They should send it by EOD." },
    { id: 2, author: "Alex Brown", initial: "AB", time: "30 mins ago", content: "Thanks Sarah. Let's keep this open until we receive it." },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4 overflow-y-auto mb-4">
        {comments.map(c => (
          <div key={c.id} className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700 shrink-0">
              {c.initial}
            </div>
            <div className="bg-gray-50 rounded-lg p-3 flex-1 border border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">{c.author}</span>
                <span className="text-xs text-gray-500">{c.time}</span>
              </div>
              <p className="text-sm text-gray-700">{c.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
        <textarea 
          className="w-full border-0 p-3 text-sm focus:ring-0 resize-none h-20" 
          placeholder="Type an internal note..."
          aria-label="Add a comment"
        ></textarea>
        <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500" aria-label="Mention someone">
              <AtSign className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500" aria-label="Attach file">
              <Paperclip className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <Button size="sm" className="h-7 text-xs">
            <Send className="mr-2 h-3 w-3" aria-hidden="true" />
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
