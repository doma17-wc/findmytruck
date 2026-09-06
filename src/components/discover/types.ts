import type { EventWithTrucks, PublicTruck, TruckSchedule } from "@/lib/types";
import type { TruckStatus } from "@/lib/geo";

export interface TruckRating {
  avg: number;
  count: number;
}

/** Set on an entry only when the discovery view is showing a specific planned
 *  day (not "Today"). Live open/boosted status does not apply — the card shows
 *  these planned hours instead. */
export interface DayPlan {
  /** The calendar date being viewed. */
  date: Date;
  /** "HH:MM" – "HH:MM" for that day. */
  start: string;
  end: string;
  locationName: string;
  /** True when the appearance comes from an event rather than the weekly tour. */
  fromEvent: boolean;
  /** Event id when `fromEvent` — lets the card deep-link to the event. */
  eventId?: string | null;
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
  /** Only present when viewing a specific planned day (not "Today"). */
  dayPlan?: DayPlan | null;
}

export type SortKey = "distance" | "rating" | "name";
