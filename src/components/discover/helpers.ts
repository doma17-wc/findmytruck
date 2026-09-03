import type { TruckWithSchedules } from "@/lib/data";
import { computeTruckStatus, readBoost } from "@/lib/geo";
import { regionFallbackStatus } from "@/lib/unclaimed";
import type { DiscoverEntry, TruckRating } from "./types";

/** True when a truck reads as available right now — boosted OR open by schedule. */
export function isAvailableNow(entry: DiscoverEntry): boolean {
  return entry.status.tier !== "closed";
}

export function buildEntries(
  trucks: TruckWithSchedules[],
  ratings: Record<string, TruckRating>,
  now: Date
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

      return {
        truck,
        status,
        schedules,
        coord: [active.location_lng, active.location_lat],
        rating: ratings[truck.id] ?? null,
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
