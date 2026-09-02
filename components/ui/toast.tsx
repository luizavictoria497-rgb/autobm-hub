import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info, MessageCircle as X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  push: (message: string, type?: ToastType, action?: { label: string; onAction: () => void }) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (message: string, type: ToastType = "info", action?: { label: string; onAction: () => void }) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, message, type, actionLabel: action?.label, onAction: action?.onAction }]);
      window.setTimeout(() => remove(id), 4500);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-[var(--border)] bg-white p-3 shadow-[0_4px_16px_rgba(15,23,42,0.08)] animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            {item.type === "success" && <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-600" />}
            {item.type === "error" && <XCircle className="mt-0.5 h-5 w-5 flex-none text-red-600" />}
            {item.type === "info" && <Info className="mt-0.5 h-5 w-5 flex-none text-[var(--accent)]" />}
            <p className="min-w-0 flex-1 text-sm text-[var(--foreground)]">{item.message}</p>
            {item.actionLabel && item.onAction && (
              <button
                type="button"
                onClick={() => {
                  item.onAction?.();
                  remove(item.id);
                }}
                className="flex-none text-sm font-medium text-[var(--accent)] hover:underline"
              >
                {item.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(item.id)}
              className="flex-none text-[var(--muted)] hover:text-[var(--foreground)]"
              aria-label="Fechar aviso"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de ToastProvider");
  return ctx;
}
