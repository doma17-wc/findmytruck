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
