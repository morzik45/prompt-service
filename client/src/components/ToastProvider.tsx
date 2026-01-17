import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createId } from "@/lib/id";

export type ToastTone = "default" | "success" | "error";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
}

interface ToastContextValue {
  push: (toast: Omit<ToastItem, "id">) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const push = React.useCallback((toast: Omit<ToastItem, "id">) => {
    const id = createId();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed right-6 top-6 z-50 flex w-[320px] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "rounded-lg border border-ink/10 bg-white/90 p-4 shadow-lg",
              toast.tone === "success" && "border-moss/40",
              toast.tone === "error" && "border-red-500/40"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{toast.title}</p>
                {toast.description && <p className="text-xs text-ink/70">{toast.description}</p>}
              </div>
              <button onClick={() => dismiss(toast.id)} className="text-ink/50 hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
