import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react";
import { useDashboardStore } from "../../store/dashboardStore";
import { cn } from "../../utils/cn";
import type { ToastKind } from "../../types";

const ICONS: Record<ToastKind, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const COLORS: Record<ToastKind, string> = {
  info: "text-cyan-300 ring-cyan-400/30",
  success: "text-emerald-300 ring-emerald-400/30",
  warning: "text-amber-300 ring-amber-400/30",
  error: "text-rose-300 ring-rose-400/30",
};

export function Toasts() {
  const toasts = useDashboardStore((s) => s.toasts);
  const dismissToast = useDashboardStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-96 max-w-[calc(100vw-2.5rem)] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              className={cn(
                "glass-panel pointer-events-auto flex items-start gap-3 rounded-lg p-3.5 ring-1 shadow-lg shadow-black/40",
                COLORS[t.kind]
              )}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-100">{t.title}</p>
                {t.message && (
                  <p className="mt-0.5 break-words font-mono-techno text-[11px] leading-relaxed text-slate-400">
                    {t.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismissToast(t.id)}
                className="shrink-0 text-slate-500 hover:text-slate-300"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
