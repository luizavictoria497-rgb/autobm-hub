import { useEffect, type ReactNode } from "react";
import { MessageCircle as X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  widthClassName?: string;
}

export function Modal({ open, onClose, title, description, children, footer, widthClassName }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        className={cn(
          "max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.12)] animate-in fade-in slide-in-from-bottom-4 duration-200 sm:rounded-2xl",
          widthClassName ?? "sm:max-w-lg"
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[var(--foreground)] [text-wrap:balance]">{title}</h2>
            {description && <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex-none rounded-md p-1 text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div>{children}</div>
        {footer && <div className="mt-6 flex flex-wrap items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
