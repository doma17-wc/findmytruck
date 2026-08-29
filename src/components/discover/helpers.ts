import type { TruckSchedule } from "@/lib/types";
import type { TruckWithSchedules } from "@/lib/data";
import { computeTruckStatus, isNowWithin, timeToMinutes } from "@/lib/geo";
import { regionFallbackStatus } from "@/lib/unclaimed";
import type { DiscoverEntry, TruckRating } from "./types";

/** The synthetic "Go live" schedule row, if the truck has one for today. */
export function findLiveRow(schedules: TruckSchedule[]): TruckSchedule | null {
  return (
    schedules.find((s) => s.specific_date != null || s.notes === "live") ?? null
  );
}

export function buildEntries(
  trucks: TruckWithSchedules[],
  ratings: Record<string, TruckRating>,
  now: Date
): DiscoverEntry[] {
  return trucks
    .map(({ truck, schedules }): DiscoverEntry | null => {
      let status = computeTruckStatus(schedules, now);
      if (!status.schedule) status = regionFallbackStatus(truck) ?? status;
      const active = status.schedule;
      if (!active) return null;

      const liveRow = findLiveRow(schedules);
      const live =
        liveRow != null &&
        isNowWithin(liveRow.start_time, liveRow.end_time, now) &&
        status.state === "open";

      return {
        truck,
        status,
        schedules,
        coord: [active.location_lng, active.location_lat],
        rating: ratings[truck.id] ?? null,
        live,
        liveSince: live && liveRow ? liveRow.start_time : null,
      };
    })
    .filter((e): e is DiscoverEntry => e !== null);
}

/** "just now" / "12 min ago" / "3h ago" from an "HH:MM[:SS]" time earlier today. */
export function timeAgo(hhmm: string, now: Date): string {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const diff = Math.max(0, nowMin - timeToMinutes(hhmm));
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff} min ago`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m ? `${h}h ${m}m ago` : `${h}h ago`;
}

/** Cuisine filter chips shown in the filter row. */
export const CUISINE_CHIPS = [
  "Burgers",
  "Pizza",
  "Asian",
  "Mexican",
  "BBQ",
  "Indian",
  "Kebab",
  "Vegan",
  "Coffee",
  "Desserts",
  "Sandwiches",
] as const;

export function matchesCuisine(cuisineType: string[], chip: string): boolean {
  const c = chip.toLowerCase();
  return cuisineType.some((raw) => {
    const v = raw.toLowerCase();
    return v.includes(c) || c.includes(v);
  });
}

export interface DietaryPill {
  label: string;
  className: string;
}

/** Map a truck's free-text dietary_options to coloured pills for the sheet. */
export function dietaryPills(options: string[]): DietaryPill[] {
  const defs: { test: RegExp; label: string; className: string }[] = [
    { test: /vegan/i, label: "Vegan", className: "bg-green-100 text-green-700" },
    {
      test: /vegetar/i,
      label: "Vegetarian",
      className: "bg-emerald-100 text-emerald-700",
    },
    {
      test: /gluten/i,
      label: "Gluten-free",
      className: "bg-amber-100 text-amber-700",
    },
    { test: /halal/i, label: "Halal", className: "bg-blue-100 text-blue-700" },
    { test: /kosher/i, label: "Kosher", className: "bg-indigo-100 text-indigo-700" },
    {
      test: /nut-?free/i,
      label: "Nut-free",
      className: "bg-orange-100 text-orange-700",
    },
  ];
  const seen = new Set<string>();
  const pills: DietaryPill[] = [];
  for (const opt of options) {
    for (const d of defs) {
      if (d.test.test(opt) && !seen.has(d.label)) {
        seen.add(d.label);
        pills.push({ label: d.label, className: d.className });
      }
    }
  }
  return pills;
}
