"use client";
// Route 53 style notifications: green/red banners (Flashbar) at the top of the page.
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { FlashbarProps } from "@cloudscape-design/components/flashbar";

interface NotificationValue {
  items: FlashbarProps.MessageDefinition[];
  success: (content: ReactNode) => void;
  error: (content: ReactNode) => void;
}

const NotificationContext = createContext<NotificationValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<FlashbarProps.MessageDefinition[]>([]);

  const push = useCallback((type: "success" | "error", content: ReactNode) => {
    const id = String(Date.now() + Math.random());
    const dismiss = () => setItems((prev) => prev.filter((i) => i.id !== id));
    // newest on top, keep at most 3
    setItems((prev) => [{ id, type, content, dismissible: true, onDismiss: dismiss }, ...prev].slice(0, 3));
    if (type === "success") setTimeout(dismiss, 8000);
  }, []);

  const success = useCallback((c: ReactNode) => push("success", c), [push]);
  const error = useCallback((c: ReactNode) => push("error", c), [push]);

  return <NotificationContext.Provider value={{ items, success, error }}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}
