"use client";

import { useState, useTransition, type ReactNode } from "react";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export const adminInput =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[15px] text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 placeholder:text-muted";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-card shadow-paper", className)}>
      {children}
    </div>
  );
}

const TONE: Record<string, string> = {
  neutral: "bg-paper-deep text-ink-soft",
  green: "bg-live/10 text-live",
  amber: "bg-amber/10 text-amber",
  red: "bg-accent/10 text-accent-dark",
  blue: "bg-blue/10 text-blue",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof TONE;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold",
        TONE[tone]
      )}
    >
      {children}
    </span>
  );
}

/**
 * Button that runs a server action, optionally behind a window.confirm() step,
 * with a pending state. Shows an alert() on a returned { error }.
 */
export type ActionResult = { error?: string; success?: boolean } | void;

export function ActionButton({
  onRun,
  confirm,
  children,
  className,
  pendingLabel,
}: {
  onRun: () => Promise<ActionResult>;
  confirm?: string;
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          const res = await onRun();
          if (res && "error" in res && res.error) window.alert(res.error);
        });
      }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-50",
        className
      )}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

/* ----------------------------- BarChart ---------------------------- */

export function BarChart({
  data,
  accent = "#FF5A3C",
  height = 140,
}: {
  data: { label: string; value: number }[];
  accent?: string;
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
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-[11px] font-medium text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Ranked horizontal bars for labeled data (top trucks, top cuisines, ...). */
export function RankedBars({
  data,
  accent = "#FF5A3C",
  emptyLabel = "Not enough data yet",
}: {
  data: { label: string; value: number }[];
  accent?: string;
  emptyLabel?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-line py-8 text-center text-sm text-muted">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-32 flex-shrink-0 truncate text-[13px] font-medium text-ink-soft" title={d.label}>
            {d.label}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper-deep">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${d.value ? Math.max(4, (d.value / max) * 100) : 0}%`, background: accent }}
            />
          </div>
          <span className="w-10 flex-shrink-0 text-right font-mono text-[12px] text-muted">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Small pill tabs for a 7d/30d/90d date-range filter. */
export function RangeTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex flex-shrink-0 gap-0.5 rounded-xl bg-paper-deep p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-bold transition",
            value === opt.value ? "bg-card text-ink shadow-sm ring-1 ring-black/5" : "text-muted hover:text-ink-soft"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: "neutral" | "green" | "amber" | "blue";
}) {
  const ring =
    tone === "green"
      ? "text-live"
      : tone === "amber"
      ? "text-amber"
      : tone === "blue"
      ? "text-blue"
      : "text-ink";
  return (
    <Card className="p-4">
      <div className={cn("font-display text-2xl font-extrabold", ring)}>{value}</div>
      <div className="mt-0.5 text-xs font-semibold text-muted">{label}</div>
      {sub && <div className="mt-1 text-[11px] text-muted">{sub}</div>}
    </Card>
  );
}

/** Inline "type a value then submit" control (e.g. assign owner by email). */
export function InlineForm({
  placeholder,
  buttonLabel,
  type = "text",
  onSubmit,
}: {
  placeholder: string;
  buttonLabel: string;
  type?: string;
  onSubmit: (value: string) => Promise<ActionResult>;
}) {
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <input
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-1.5 text-sm outline-none focus:border-accent"
      />
      <button
        type="button"
        disabled={pending || !value.trim()}
        onClick={() =>
          start(async () => {
            const res = await onSubmit(value.trim());
            if (res && "error" in res && res.error) window.alert(res.error);
            else setValue("");
          })
        }
        className="rounded-lg bg-ink px-3 py-1.5 text-sm font-bold text-white transition hover:bg-ink-soft disabled:opacity-50"
      >
        {pending ? "…" : buttonLabel}
      </button>
    </div>
  );
}
