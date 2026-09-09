import type { TruckWithSchedules } from "@/lib/data";
import type { EventWithTrucks, TruckSchedule } from "@/lib/types";
import {
  computeTruckStatus,
  computeTruckDayPlan,
  readBoost,
  type DayPlanSlot,
  type TruckStatus,
} from "@/lib/geo";
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

const plannedStatus = (schedule: TruckSchedule | null): TruckStatus => ({
  tier: "open",
  label: "Planned",
  detail: null,
  schedule,
  openUntil: null,
  boostedAt: null,
  next: null,
});

/**
 * Entries for a specific planned day (not "Today"). A truck shows up when it has
 * a schedule slot that day (weekly tour, honouring alternate/monthly frequency)
 * OR an event covering that date. Live open/boosted status is not computed —
 * each entry carries a `dayPlan` with the planned hours instead.
 *
 * A truck that visits more than one *location* that day (e.g. lunch at Bellevue,
 * dinner at Oerlikon) yields one entry — and therefore one map pin / list card —
 * per distinct location. Split shifts at the same spot stay a single entry with
 * both time ranges.
 */
export function buildDayEntries(
  trucks: TruckWithSchedules[],
  ratings: Record<string, TruckRating>,
  targetDate: Date,
  eventsByTruck: Record<string, EventWithTrucks[]> = {}
): DiscoverEntry[] {
  const iso = dateStr(targetDate);
  const out: DiscoverEntry[] = [];

  for (const { truck, schedules } of trucks) {
    const events = eventsByTruck[truck.id] ?? [];
    const dayEvent = events.find((e) => e.start_date <= iso && iso <= e.end_date) ?? null;
    const plan = computeTruckDayPlan(schedules, targetDate);

    if (!dayEvent && !plan) continue;

    const rating = ratings[truck.id] ?? null;

    // An event covering the day takes the pin (it's the "headline" appearance).
    if (dayEvent) {
      out.push({
        truck,
        entryKey: truck.id,
        status: plannedStatus(plan?.primary.schedule ?? null),
        schedules,
        coord: [dayEvent.location_lng, dayEvent.location_lat],
        rating,
        events,
        activeEvent: dayEvent,
        dayPlan: {
          date: targetDate,
          start: (dayEvent.start_time ?? plan?.primary.start ?? "").slice(0, 5),
          end: (dayEvent.end_time ?? plan?.primary.end ?? "").slice(0, 5),
          locationName: dayEvent.location_name,
          fromEvent: true,
          eventId: dayEvent.id,
        },
      });
      continue;
    }

    // Group this day's slots by location -> one entry per distinct spot.
    const groups = new Map<string, DayPlanSlot[]>();
    for (const s of plan!.all) {
      const key = `${s.schedule.location_lat.toFixed(4)},${s.schedule.location_lng.toFixed(4)}`;
      const g = groups.get(key);
      if (g) g.push(s);
      else groups.set(key, [s]);
    }

    const multi = groups.size > 1;
    let i = 0;
    for (const slots of groups.values()) {
      const first = slots[0];
      const last = slots[slots.length - 1];
      const dayPlan: DayPlan = {
        date: targetDate,
        start: first.start,
        end: last.end,
        slotsLabel:
          slots.length > 1 ? slots.map((s) => `${s.start}–${s.end}`).join(" · ") : undefined,
        locationName: first.schedule.location_name,
        fromEvent: false,
      };
      out.push({
        truck,
        entryKey: multi ? `${truck.id}__${i}` : truck.id,
        status: plannedStatus(first.schedule),
        schedules,
        coord: [first.schedule.location_lng, first.schedule.location_lat],
        rating,
        events,
        activeEvent: null,
        dayPlan,
      });
      i += 1;
    }
  }

  return out;
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
