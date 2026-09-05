"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Check, X } from "lucide-react";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------- Card ------------------------------ */

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-card shadow-paper",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

/* ------------------------------ Toasts ----------------------------- */

interface Toast {
  id: number;
  message: string;
  tone: "success" | "error";
}

const ToastContext = createContext<(message: string, tone?: "success" | "error") => void>(
  () => {}
);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "toast-in pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg",
              t.tone === "success" ? "bg-ink" : "bg-accent-dark"
            )}
          >
            {t.tone === "success" ? (
              <Check className="h-4 w-4 text-live" />
            ) : (
              <X className="h-4 w-4" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ------------------------------ Beacon ----------------------------- */

export function Beacon({ live }: { live: boolean }) {
  return (
    <span className="relative flex h-3 w-3 flex-shrink-0">
      {live && (
        <span className="beacon-ping absolute inline-flex h-full w-full rounded-full bg-live" />
      )}
      <span
        className={cn(
          "relative inline-flex h-3 w-3 rounded-full",
          live ? "bg-live" : "bg-muted"
        )}
      />
    </span>
  );
}

/* ----------------------------- BarChart ---------------------------- */

export function BarChart({
  data,
  accent = "#FF5A3C",
  suffix = "",
  height = 140,
}: {
  data: { label: string; value: number }[];
  accent?: string;
  suffix?: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const allZero = data.every((d) => d.value === 0);

  if (allZero) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted"
        style={{ height }}
      >
        Not enough data yet
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="font-mono text-[11px] text-muted">{d.value || ""}</span>
          <div
            className="w-full rounded-md transition-all"
            style={{
              height: `${Math.max(2, (d.value / max) * (height - 44))}px`,
              background: d.value ? accent : "#E3DDD2",
              opacity: d.value ? 1 : 0.5,
            }}
            title={`${d.label}: ${d.value}${suffix}`}
          />
          <span className="text-[11px] font-medium text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------------- shared input styling ---------------------- */

export const dashInput =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[15px] text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 placeholder:text-muted";

/* -------------------- Segmented control (light) -------------------- *
 * A soft pill/segmented toggle: a low-contrast paper track with a raised
 * white thumb + brand-orange label for the active option. Replaces the old
 * heavy black (`bg-ink text-white`) active state. Used for the schedule
 * frequency picker and any similar dashboard toggle.                   */

export const segmentTrackClass =
  "inline-flex flex-wrap gap-0.5 rounded-xl bg-paper-deep p-0.5";

export function segmentButtonClass(active: boolean, className?: string): string {
  return cn(
    "rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition select-none",
    active
      ? "bg-card text-brand-700 shadow-sm ring-1 ring-black/5"
      : "text-muted hover:text-ink-soft",
    className
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "sm",
  ariaLabel,
}: {
  options: { value: T; label: string; title?: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  return (
    <div className={segmentTrackClass} role="tablist" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          title={opt.title}
          onClick={() => onChange(opt.value)}
          className={segmentButtonClass(
            value === opt.value,
            size === "md" ? "px-3.5 py-2 text-xs" : undefined
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
