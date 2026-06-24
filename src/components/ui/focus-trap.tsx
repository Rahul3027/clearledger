"use client";

import React, { useEffect, useRef } from "react";

interface FocusTrapProps {
  children: React.ReactNode;
  isActive: boolean;
  onEscape?: () => void;
}

export function FocusTrap({ children, isActive, onEscape }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isActive) {
      // Store the currently focused element
      previousFocusRef.current = document.activeElement as HTMLElement;

      const focusableElementsString =
        'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isActive || !containerRef.current) return;

        if (e.key === "Escape" && onEscape) {
          onEscape();
          return;
        }

        if (e.key === "Tab") {
          const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(focusableElementsString);
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (!e.shiftKey && document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }

          if (e.shiftKey && document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        }
      };

      document.addEventListener("keydown", handleKeyDown);

      // Focus the first element inside the trap
      const focusable = containerRef.current?.querySelectorAll<HTMLElement>(focusableElementsString);
      if (focusable && focusable.length > 0) {
        // give it a tiny tick to ensure DOM is fully rendered
        setTimeout(() => focusable[0].focus(), 10);
      }

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        // Restore focus on cleanup
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isActive, onEscape]);

  return (
    <div ref={containerRef} className="contents">
      {children}
    </div>
  );
}
