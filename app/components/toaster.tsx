import { useSyncExternalStore } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";

import {
  dismissToast,
  getServerToasts,
  getToasts,
  subscribe,
  type ToastVariant,
} from "~/lib/toast-store";

const variants: Record<
  ToastVariant,
  {
    icon: typeof CheckCircle2;
    className: string;
    iconClassName: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-950",
    iconClassName: "text-emerald-600",
  },
  error: {
    icon: AlertCircle,
    className:
      "border-rose-200 bg-rose-50 text-rose-950",
    iconClassName: "text-rose-600",
  },
  info: {
    icon: Info,
    className:
      "border-sky-200 bg-sky-50 text-sky-950",
    iconClassName: "text-sky-600",
  },
};

export function Toaster() {
  const toasts = useSyncExternalStore(
    subscribe,
    getToasts,
    getServerToasts,
  );

  return (
    <div
      className="fixed right-4 top-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-3"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const config = variants[toast.variant];
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            role={
              toast.variant === "error"
                ? "alert"
                : "status"
            }
            className={`flex items-start gap-3 rounded-2xl border p-4 shadow-xl ${config.className}`}
          >
            <Icon
              className={`mt-0.5 h-5 w-5 shrink-0 ${config.iconClassName}`}
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {toast.title}
              </p>
              {toast.description ? (
                <p className="mt-1 break-words text-xs opacity-80">
                  {toast.description}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="rounded-lg p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
