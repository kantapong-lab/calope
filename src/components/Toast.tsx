"use client";

import { createContext, useCallback, useContext, useState } from "react";

type Kind = "success" | "danger";
type ToastItem = { id: number; kind: Kind; message: string };

const ToastContext = createContext<(message: string, kind?: Kind) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, kind: Kind = "success") => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, kind, message }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region">
        {toasts.map((t) => (
          <div key={t.id} role={t.kind === "danger" ? "alert" : "status"} className={`alert alert-${t.kind}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
