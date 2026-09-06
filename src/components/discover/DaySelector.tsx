"use client";

import { useMemo, useRef } from "react";
import { CalendarDays } from "lucide-react";
import { dateStr } from "@/lib/events";
import { useLang, weekdayName, shortDate } from "@/lib/i18n";

/** Local Y-M-D key for comparing two dates by calendar day. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

interface DaySelectorProps {
  /** null = Today (live view). */
  value: Date | null;
  onChange: (d: Date | null) => void;
}

/**
 * Day picker for the discovery homepage: Today / Tomorrow / the next few
 * weekdays as chips, plus a calendar button for any far-off date.
 */
export default function DaySelector({ value, onChange }: DaySelectorProps) {
  const { lang, t } = useLang();
  const inputRef = useRef<HTMLInputElement>(null);

  const today = useMemo(() => startOfDay(new Date()), []);
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        return d;
      }),
    [today]
  );

  const selectedKey = value ? dayKey(startOfDay(value)) : dayKey(today);
  const matchesVisible = days.some((d) => dayKey(d) === selectedKey);
  const farActive = value != null && !matchesVisible;

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    // showPicker isn't in older lib.dom typings.
    const withPicker = el as HTMLInputElement & { showPicker?: () => void };
    if (typeof withPicker.showPicker === "function") withPicker.showPicker();
    else el.click();
  };

  const handlePicked = (raw: string) => {
    if (!raw) return;
    const [y, m, d] = raw.split("-").map(Number);
    if (!y || !m || !d) return;
    const picked = startOfDay(new Date(y, m - 1, d));
    onChange(dayKey(picked) === dayKey(today) ? null : picked);
  };

  const chip = (active: boolean) =>
    `flex-shrink-0 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition ${
      active
        ? "border-brand bg-brand text-white shadow-sm"
        : "border-line bg-card text-ink-soft hover:border-brand-300"
    }`;

  return (
    <div className="flex flex-shrink-0 items-center gap-2 border-b border-line bg-paper px-4 py-2">
      <div className="no-scrollbar flex flex-1 items-center gap-2 overflow-x-auto">
        {days.map((d, i) => {
          const active = !farActive && dayKey(d) === selectedKey;
          const label =
            i === 0
              ? t("today")
              : i === 1
              ? t("tomorrow")
              : weekdayName(d, lang, "short");
          return (
            <button
              key={dayKey(d)}
              type="button"
              onClick={() => onChange(i === 0 ? null : new Date(d))}
              className={chip(active)}
              aria-pressed={active}
            >
              {label}
            </button>
          );
        })}

        {farActive && value && (
          <button
            type="button"
            onClick={openPicker}
            className={chip(true)}
            aria-pressed
          >
            {weekdayName(value, lang, "short")} · {shortDate(value, lang)}
          </button>
        )}
      </div>

      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={openPicker}
          aria-label={t("pickDate")}
          title={t("pickDate")}
          className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
            farActive
              ? "border-brand bg-brand text-white"
              : "border-line bg-card text-ink-soft hover:border-brand-300 hover:text-brand"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
        </button>
        <input
          ref={inputRef}
          type="date"
          min={dateStr(today)}
          value={dateStr(value ?? today)}
          onChange={(e) => handlePicked(e.target.value)}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
          tabIndex={-1}
          aria-hidden
        />
      </div>
    </div>
  );
}
