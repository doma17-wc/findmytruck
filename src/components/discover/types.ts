import type { PublicTruck, TruckSchedule } from "@/lib/types";
import type { TruckStatus } from "@/lib/geo";

export interface TruckRating {
  avg: number;
  count: number;
}

/** One row in the discovery list + its matching map pin. */
export interface DiscoverEntry {
  truck: PublicTruck;
  status: TruckStatus;
  /** Full weekly schedule (plus any live row) for the detail sheet. */
  schedules: TruckSchedule[];
  /** [lng, lat] taken from status.schedule — always present (entries without a
   *  usable location are filtered out upstream). */
  coord: [number, number];
  rating: TruckRating | null;
  /** True when the owner hit "Go live" today and we're inside that window. */
  live: boolean;
  /** "HH:MM:SS" the live session started, for the "confirmed live X ago" line. */
  liveSince: string | null;
}

export type SortKey = "distance" | "rating" | "name";
