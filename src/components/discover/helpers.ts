import type { TruckWithSchedules } from "@/lib/data";
import type { EventWithTrucks, TruckSchedule } from "@/lib/types";
import { computeTruckStatus, computeTruckDayPlan, readBoost, type TruckStatus } from "@/lib/geo";
import { dateStr, isEventOngoing } from "@/lib/events";
import { regionFallbackStatus } from "@/lib/unclaimed";
import type { DayPlan, DiscoverEntry, TruckRating } from "./types";

/** True when a truck reads as available right now — boosted OR open by schedule. */
export function isAvailableNow(entry: DiscoverEntry): boolean {
  return entry.status.tier !== "closed";
}

export function buildEntries(
  trucks: TruckWithSchedules[],
  ratings: Record<string, TruckRating>,
  now: Date,
  eventsByTruck: Record<string, EventWithTrucks[]> = {}
): DiscoverEntry[] {
  return trucks
    .map(({ truck, schedules }): DiscoverEntry | null => {
      let status = computeTruckStatus(schedules, now, readBoost(truck));

      // No real pin yet — drop the truck at its region centre (imported profile).
      if (!status.schedule) {
        const fallback = regionFallbackStatus(truck);
        if (!fallback) return null;
        status =
          status.tier === "closed"
            ? fallback
            : { ...status, schedule: fallback.schedule, isRegionFallback: true };
      }

      const active = status.schedule;
      if (!active) return null;

      const events = eventsByTruck[truck.id] ?? [];
      const activeEvent = events.find((e) => isEventOngoing(e, now)) ?? null;

      return {
        truck,
        status,
        schedules,
        coord: [active.location_lng, active.location_lat],
        rating: ratings[truck.id] ?? null,
        events,
        activeEvent,
      };
    })
    .filter((e): e is DiscoverEntry => e !== null);
}

/**
 * Entries for a specific planned day (not "Today"). A truck shows up when it has
 * a schedule slot that day (weekly tour, honouring alternate/monthly frequency)
 * OR an event covering that date. Live open/boosted status is not computed —
 * each entry carries a `dayPlan` with the planned hours instead.
 */
export function buildDayEntries(
  trucks: TruckWithSchedules[],
  ratings: Record<string, TruckRating>,
  targetDate: Date,
  eventsByTruck: Record<string, EventWithTrucks[]> = {}
): DiscoverEntry[] {
  const iso = dateStr(targetDate);

  return trucks
    .map(({ truck, schedules }): DiscoverEntry | null => {
      const events = eventsByTruck[truck.id] ?? [];
      const dayEvent =
        events.find((e) => e.start_date <= iso && iso <= e.end_date) ?? null;
      const plan = computeTruckDayPlan(schedules, targetDate);

      if (!dayEvent && !plan) return null;

      let coord: [number, number];
      let dayPlan: DayPlan;
      let pinSchedule: TruckSchedule | null;

      if (dayEvent) {
        coord = [dayEvent.location_lng, dayEvent.location_lat];
        dayPlan = {
          date: targetDate,
          start: (dayEvent.start_time ?? plan?.primary.start ?? "").slice(0, 5),
          end: (dayEvent.end_time ?? plan?.primary.end ?? "").slice(0, 5),
          locationName: dayEvent.location_name,
          fromEvent: true,
          eventId: dayEvent.id,
        };
        pinSchedule = plan?.primary.schedule ?? null;
      } else {
        const primary = plan!.primary;
        coord = [primary.schedule.location_lng, primary.schedule.location_lat];
        dayPlan = {
          date: targetDate,
          start: primary.start,
          end: primary.end,
          locationName: primary.schedule.location_name,
          fromEvent: false,
        };
        pinSchedule = primary.schedule;
      }

      const status: TruckStatus = {
        tier: "open",
        label: "Planned",
        detail: null,
        schedule: pinSchedule,
        openUntil: null,
        boostedAt: null,
        next: null,
      };

      return {
        truck,
        status,
        schedules,
        coord,
        rating: ratings[truck.id] ?? null,
        events,
        activeEvent: dayEvent,
        dayPlan,
      };
    })
    .filter((e): e is DiscoverEntry => e !== null);
}

/**
 * Cuisine filter chips shown in the filter row.
 *
 * Each chip maps to a list of lower-case keywords. A truck matches the chip
 * when any of its `cuisine_type` values contains — or is contained by — one of
 * those keywords (case-insensitive, punctuation-tolerant). The keyword lists
 * are built from the values that actually exist in the `public_trucks` table
 * ("Asian", "Burgers", "Sandwiches", "Mexican", "Pizza", "Italian", "BBQ",
 * "Hot Dogs", "Vegan/Vegetarian", "Desserts", "Middle Eastern", "Coffee/Drinks",
 * "Poke/Bowls", "Crêpes/Waffles", "Greek", "Mediterranean", "Seafood", …) plus
 * common synonyms so freshly-added trucks keep matching.
 */
export const CUISINE_CHIP_KEYWORDS: Record<string, string[]> = {
  Burgers: ["burger", "smash", "american", "fries"],
  Asian: [
    "asian",
    "thai",
    "chinese",
    "japanese",
    "sushi",
    "korean",
    "vietnamese",
    "indian",
    "curry",
    "noodle",
    "ramen",
    "wok",
    "dumpling",
    "bao",
    "poke",
    "bowl",
  ],
  Pizza: ["pizza", "italian", "pasta", "focaccia"],
  Mexican: ["mexican", "taco", "burrito", "quesadilla", "latin", "tex-mex"],
  BBQ: ["bbq", "barbecue", "barbeque", "grill", "smoke", "pulled", "brisket"],
  Sandwiches: ["sandwich", "sub", "deli", "wrap", "panini", "bagel", "baguette", "toastie"],
  "Hot Dogs": ["hot dog", "hotdog", "dog", "sausage", "bratwurst", "wurst"],
  Kebab: [
    "kebab",
    "döner",
    "doner",
    "middle eastern",
    "falafel",
    "shawarma",
    "turkish",
    "lebanese",
    "halloumi",
  ],
  Mediterranean: ["mediterranean", "greek", "gyros", "souvlaki", "meze", "hummus"],
  Vegan: ["vegan", "vegetar", "plant", "plant-based"],
  Coffee: ["coffee", "drink", "espresso", "tea", "juice", "smoothie", "matcha"],
  Desserts: [
    "dessert",
    "sweet",
    "ice cream",
    "gelato",
    "crêpe",
    "crepe",
    "waffle",
    "pastry",
    "donut",
    "doughnut",
    "churro",
    "cake",
    "cookie",
  ],
};

export const CUISINE_CHIPS = Object.keys(CUISINE_CHIP_KEYWORDS) as ReadonlyArray<
  keyof typeof CUISINE_CHIP_KEYWORDS
>;

export function matchesCuisine(cuisineType: string[], chip: string): boolean {
  const keywords = CUISINE_CHIP_KEYWORDS[chip] ?? [chip.toLowerCase()];
  return cuisineType.some((raw) => {
    const v = raw.toLowerCase().trim();
    if (!v) return false;
    return keywords.some((k) => v.includes(k) || k.includes(v));
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
