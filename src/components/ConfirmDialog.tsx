import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { useDashboardStore } from "../store/dashboardStore";
import { t } from "../i18n";

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type Request = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

let openRequest: ((request: Request) => void) | null = null;

/**
 * Показывает модальное окно подтверждения.
 * Возвращает true, если пользователь согласился.
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!openRequest) {
      // Если окно ещё не смонтировано, используем системное как запасной вариант
      resolve(window.confirm(options.message ?? options.title));
      return;
    }

    openRequest({ ...options, resolve });
  });
}

/** Этот компонент нужно один раз разместить в корне приложения. */
export function ConfirmHost() {
  const language = useDashboardStore((s) => s.language);
  const [request, setRequest] = useState<Request | null>(null);

  useEffect(() => {
    openRequest = (next) => setRequest(next);
    return () => {
      openRequest = null;
    };
  }, []);

  useEffect(() => {
    if (!request) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
      }

      if (event.key === "Enter") {
        event.preventDefault();
        close(true);
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [request]);

  function close(result: boolean) {
    if (!request) return;
    request.resolve(result);
    setRequest(null);
  }

  if (!request) return null;

  const confirmLabel = request.confirmLabel ?? t("dialog.confirm", language);
  const cancelLabel = request.cancelLabel ?? t("dialog.cancel", language);
  const danger = request.danger ?? true;

  return createPortal(
    <div
      onMouseDown={() => close(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          width: "min(420px, calc(100vw - 32px))",
          borderRadius: 12,
          padding: 18,
          background: "var(--nd-panel, #12161d)",
          border: "1px solid var(--nd-panel-border, rgba(255,255,255,0.12))",
          color: "var(--nd-text, #e6edf3)",
          boxShadow: "0 24px 60px -20px rgba(0,0,0,0.75)",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div
            style={{
              display: "flex",
              height: 34,
              width: 34,
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              background: danger
                ? "rgba(244, 63, 94, 0.12)"
                : "color-mix(in srgb, var(--nd-accent, #38e8ff) 14%, transparent)",
              color: danger ? "#fb7185" : "var(--nd-accent, #38e8ff)",
            }}
          >
            <AlertTriangle size={18} />
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
              {request.title}
            </p>

            {request.message && (
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 12,
                  lineHeight: 1.5,
                  whiteSpace: "pre-line",
                  color: "var(--nd-text-muted, #94a3b8)",
                }}
              >
                {request.message}
              </p>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 18,
          }}
        >
          <button
            type="button"
            onClick={() => close(false)}
            style={{
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 12,
              cursor: "pointer",
              background: "transparent",
              border: "1px solid var(--nd-panel-border, rgba(255,255,255,0.14))",
              color: "var(--nd-text-muted, #94a3b8)",
            }}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            autoFocus
            onClick={() => close(true)}
            style={{
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: danger
                ? "rgba(244, 63, 94, 0.15)"
                : "color-mix(in srgb, var(--nd-accent, #38e8ff) 16%, transparent)",
              border: danger
                ? "1px solid rgba(244, 63, 94, 0.45)"
                : "1px solid var(--nd-accent, #38e8ff)",
              color: danger ? "#fda4af" : "var(--nd-accent, #38e8ff)",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}