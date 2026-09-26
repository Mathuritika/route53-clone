"use client";
// Bonus: single-key shortcuts like "/" (search) and "c" (create).
// Ignored while typing in an input so normal typing still works.
import { useEffect, useRef } from "react";

// Cloudscape keeps hidden dialog elements in the page, so only count visible ones
function isModalOpen() {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).some((d) => d.offsetParent !== null);
}

export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  const ref = useRef(shortcuts);
  ref.current = shortcuts; // always use the latest handlers without re-adding the listener

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable;
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isModalOpen()) return;
      const handler = ref.current[e.key];
      if (handler) {
        e.preventDefault(); // stops "/" from opening the browser's quick-find
        handler();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
