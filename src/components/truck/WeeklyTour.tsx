import { CalendarClock, MapPin, Repeat } from "lucide-react";
import type { TruckSchedule } from "@/lib/types";
import { summarizeWeeklyTour } from "@/lib/tour";

interface WeeklyTourProps {
  schedules: TruckSchedule[];
  /** Day index to highlight (0 = Mon … 6 = Sun) — normally today. */
  highlightDay: number;
  /** "Today" or a weekday name, for the summary line. */
  highlightLabel?: string;
  /** "Open until 20:00" etc. when the highlighted day is live right now. */
  openUntil?: string | null;
}

/**
 * Compact, merged weekly tour. Instead of seven near-identical rows it shows one
 * line per distinct stop ("Every day · Seestrasse 27 · 11:30–20:00"), highlights
 * the current day, and gathers days off into a single quiet line.
 */
export default function WeeklyTour({
  schedules,
  highlightDay,
  highlightLabel = "Today",
  openUntil,
}: WeeklyTourProps) {
  const { groups, closedLabel } = summarizeWeeklyTour(schedules, highlightDay);
  if (groups.length === 0) return null;

  const live = Boolean(openUntil);
  // A day can carry more than one stop (split service — lunch here, dinner
  // there): show every group that covers the highlighted day.
  const todayGroups = groups.filter((g) => g.containsToday);

  return (
    <div className="mt-2 space-y-2">
      {/* At-a-glance line(s) for the highlighted day */}
      <div
        className={`flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 ${
          todayGroups.length && live
            ? "border-green-500/25 bg-green-50"
            : todayGroups.length
            ? "border-brand-200 bg-brand-50/60"
            : "border-line bg-card"
        }`}
      >
        <CalendarClock
          className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
            todayGroups.length ? "text-brand" : "text-muted"
          }`}
        />
        {todayGroups.length ? (
          <div className="space-y-0.5">
            {todayGroups.map((g, i) => (
              <p key={i} className="text-[13px] leading-snug text-ink">
                <span className={`font-bold ${live ? "text-live" : "text-brand"}`}>
                  {i === 0 ? highlightLabel : "·"}
                </span>
                {" · "}
                <span className="font-semibold">{g.locationName}</span>
                {" · "}
                <span className="font-mono text-ink-soft">{g.timeLabel}</span>
                {i === 0 && live && (
                  <span className="font-semibold text-live"> · open until {openUntil}</span>
                )}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-[13px] leading-snug text-ink-soft">
            <span className="font-bold text-ink">{highlightLabel}</span> · not on the weekly tour
          </p>
        )}
      </div>

      {/* Merged stops */}
      <div className="overflow-hidden rounded-2xl border border-line shadow-paper">
        {groups.map((g, i) => (
          <div
            key={i}
            className={`flex flex-col gap-1 border-b border-line px-3.5 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${
              g.containsToday ? "bg-brand-50/60" : "bg-card"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-[13px] font-bold ${
                  g.containsToday ? "text-brand" : "text-ink"
                }`}
              >
                {g.days.length === 1 && g.containsToday && highlightLabel === "Today"
                  ? "Today"
                  : g.daysLabel}
              </span>
              {g.frequencyLabel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-paper-deep px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                  <Repeat className="h-3 w-3" />
                  {g.frequencyLabel}
                </span>
              )}
            </div>
            <div className="flex min-w-0 items-center gap-1.5 text-[13px] text-ink-soft">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted" />
              <span className="truncate font-medium text-ink">{g.locationName}</span>
              <span className="text-line">·</span>
              <span className="flex-shrink-0 font-mono text-muted">{g.timeLabel}</span>
            </div>
          </div>
        ))}
      </div>

      {closedLabel && (
        <p className="px-1 text-[12px] font-medium text-muted">{closedLabel}</p>
      )}
    </div>
  );
}
