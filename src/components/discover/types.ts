import type { EventWithTrucks, PublicTruck, TruckSchedule } from "@/lib/types";
import type { TruckStatus } from "@/lib/geo";

export interface TruckRating {
  avg: number;
  count: number;
}

/** One row in the discovery list + its matching map pin. */
export interface DiscoverEntry {
  truck: PublicTruck;
  /** Three-tier status (boosted / open / closed) — the single source of truth. */
  status: TruckStatus;
  /** Full weekly schedule for the detail sheet. */
  schedules: TruckSchedule[];
  /** [lng, lat] taken from status.schedule — always present (entries without a
   *  usable location are filtered out upstream). */
  coord: [number, number];
  rating: TruckRating | null;
  /** This truck's upcoming (incl. ongoing-today) events, soonest first. */
  events: EventWithTrucks[];
  /** Set when one of `events` is happening right now/today — drives the map badge. */
  activeEvent: EventWithTrucks | null;
}

export type SortKey = "distance" | "rating" | "name";
