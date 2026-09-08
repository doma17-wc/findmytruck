/**
 * Compact "weekly tour" summariser.
 *
 * The raw weekly schedule is up to 7+ rows that are often near-identical
 * ("Seestrasse 27 · 11:30–20:00" seven times). This collapses them into a
 * handful of scannable groups:
 *
 *   - stops with the same location + hours + frequency are merged, and the days
 *     they run are listed as ranges ("Mon–Fri", "Mon · Wed · Fri", "Every day")
 *   - split shifts on one day at one spot are folded into a single row
 *   - days with no service are gathered into one "Closed …" line
 *
 * Pure / presentational-safe — no React, no i18n (day names are the English
 * `DAY_LABELS_SHORT`, matching the rest of the site outside the homepage).
 */
import type { TruckSchedule } from "./types";
import { DAY_LABELS_SHORT } from "./types";

export interface TourSlot {
  /** "HH:MM" */
  start: string;
  /** "HH:MM" */
  end: string;
}

export interface TourGroup {
  /** Day indices this group runs on, 0 = Mon … 6 = Sun, ascending. */
  days: number[];
  /** "Every day" · "Mon–Fri" · "Mon · Wed · Fri". */
  daysLabel: string;
  locationName: string;
  slots: TourSlot[];
  /** "11:30–20:00" or "11:30–14:00 · 17:00–21:00" for split shifts. */
  timeLabel: string;
  /** "every other week" · "1st & 3rd week" — null for a plain weekly stop. */
  frequencyLabel: string | null;
  /** True when the highlighted day (usually today) falls in `days`. */
  containsToday: boolean;
}

export interface TourSummary {
  groups: TourGroup[];
  serviceDays: number[];
  closedDays: number[];
  /** "Closed Sun" · "Closed Mon · Sat–Sun" — null when the truck runs daily. */
  closedLabel: string | null;
  /** The group that covers the highlighted day, if any. */
  todayGroup: TourGroup | null;
}

const hhmm = (t: string) => t.slice(0, 5);
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** "Mon–Fri" / "Mon · Wed · Fri" / "Every day" from a set of day indices. */
export function formatDayRanges(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 0) return "";
  if (sorted.length === 7) return "Every day";

  const runs: [number, number][] = [];
  for (const d of sorted) {
    const last = runs[runs.length - 1];
    if (last && d === last[1] + 1) last[1] = d;
    else runs.push([d, d]);
  }

  return runs
    .map(([a, b]) => {
      if (a === b) return DAY_LABELS_SHORT[a];
      // A 2-day run reads better as an explicit list than a range.
      if (b - a === 1) return `${DAY_LABELS_SHORT[a]} · ${DAY_LABELS_SHORT[b]}`;
      return `${DAY_LABELS_SHORT[a]}–${DAY_LABELS_SHORT[b]}`;
    })
    .join(" · ");
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

function frequencyLabel(s: TruckSchedule): string | null {
  const freq = s.frequency ?? "weekly";
  if (freq === "alternate") return "every other week";
  if (freq === "monthly_weeks") {
    const weeks = [...(s.frequency_weeks ?? [])].sort((a, b) => a - b);
    if (weeks.length === 0) return null;
    return `${weeks.map(ordinal).join(" & ")} week`;
  }
  return null;
}

function frequencyKey(s: TruckSchedule): string {
  const freq = s.frequency ?? "weekly";
  if (freq === "alternate") return `alt:${s.frequency_parity ?? "odd"}`;
  if (freq === "monthly_weeks")
    return `mw:${[...(s.frequency_weeks ?? [])].sort((a, b) => a - b).join(",")}`;
  return "weekly";
}

const slotLabel = (slot: TourSlot) => `${slot.start}–${slot.end}`;

/**
 * Collapse a truck's weekly schedule rows into merged groups.
 *
 * @param schedules  the full schedule list (dated / region-marker rows are ignored)
 * @param highlightDay  day index to mark as "today" (0 = Mon … 6 = Sun)
 */
export function summarizeWeeklyTour(
  schedules: TruckSchedule[],
  highlightDay: number
): TourSummary {
  const weekly = schedules.filter(
    (s) => s.specific_date == null && s.start_time !== s.end_time
  );

  // location + shift + frequency -> accumulated days & slots
  const buckets = new Map<
    string,
    { locationName: string; frequency: string | null; slots: Map<string, TourSlot>; days: Set<number> }
  >();

  for (const s of weekly) {
    const slot: TourSlot = { start: hhmm(s.start_time), end: hhmm(s.end_time) };
    const locKey = s.location_name.trim().toLowerCase();
    const key = `${locKey}||${slot.start}-${slot.end}||${frequencyKey(s)}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        locationName: s.location_name.trim(),
        frequency: frequencyLabel(s),
        slots: new Map(),
        days: new Set(),
      };
      buckets.set(key, bucket);
    }
    bucket.slots.set(`${slot.start}-${slot.end}`, slot);
    bucket.days.add(s.day_of_week);
  }

  // Fold split shifts: same location + frequency + identical day-set -> one row
  // carrying every slot.
  const merged = new Map<
    string,
    { locationName: string; frequency: string | null; slots: Map<string, TourSlot>; days: Set<number> }
  >();
  for (const b of buckets.values()) {
    const dayKey = [...b.days].sort((a, z) => a - z).join(",");
    const mKey = `${b.locationName.toLowerCase()}||${b.frequency ?? ""}||${dayKey}`;
    const existing = merged.get(mKey);
    if (existing) {
      for (const [k, v] of b.slots) existing.slots.set(k, v);
    } else {
      merged.set(mKey, { ...b, slots: new Map(b.slots) });
    }
  }

  const groups: TourGroup[] = [...merged.values()]
    .map((b) => {
      const slots = [...b.slots.values()].sort((a, z) => toMin(a.start) - toMin(z.start));
      const days = [...b.days].sort((a, z) => a - z);
      return {
        days,
        daysLabel: formatDayRanges(days),
        locationName: b.locationName,
        slots,
        timeLabel: slots.map(slotLabel).join(" · "),
        frequencyLabel: b.frequency,
        containsToday: days.includes(highlightDay),
      };
    })
    .sort((a, z) => a.days[0] - z.days[0] || toMin(a.slots[0].start) - toMin(z.slots[0].start));

  const serviceDays = [...new Set(weekly.map((s) => s.day_of_week))].sort((a, z) => a - z);
  const closedDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !serviceDays.includes(d));

  return {
    groups,
    serviceDays,
    closedDays,
    closedLabel: closedDays.length > 0 ? `Closed ${formatDayRanges(closedDays)}` : null,
    todayGroup: groups.find((g) => g.containsToday) ?? null,
  };
}
