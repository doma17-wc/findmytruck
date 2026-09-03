/**
 * Helpers for the "unclaimed profiles" system (migration 0005).
 *
 * An unclaimed profile is a truck that was added from public data with no auth
 * account and no photos. It shows on the map at its region's approximate centre
 * until the owner claims it at /claim/<slug> and adds a real schedule.
 */
import type { PublicTruck, TruckSchedule } from "./types";
import type { TruckStatus } from "./geo";

/** A profile is "unclaimed-looking" until an admin has fully verified it. */
export function isUnclaimed(truck: Pick<PublicTruck, "claim_status">): boolean {
  return (truck.claim_status ?? "unclaimed") !== "claimed";
}

export function isPendingClaim(truck: Pick<PublicTruck, "claim_status">): boolean {
  return (truck.claim_status ?? "unclaimed") === "pending";
}

export const UNCLAIMED_BADGE = "Unclaimed profile · info from public sources";
export const REGION_FALLBACK_LABEL = "Location to be confirmed";

/**
 * Synthetic status placing a truck at its region centre when it has no real
 * schedule. Returns null if the truck has no region coordinates either.
 */
export function regionFallbackStatus(truck: PublicTruck): TruckStatus | null {
  if (truck.region_lat == null || truck.region_lng == null) return null;

  const schedule: TruckSchedule = {
    id: `region-${truck.id}`,
    truck_id: truck.id,
    day_of_week: 0,
    location_name: truck.source_region ?? REGION_FALLBACK_LABEL,
    location_lat: truck.region_lat,
    location_lng: truck.region_lng,
    start_time: "00:00:00",
    end_time: "00:00:00",
    is_recurring: false,
    specific_date: null,
    notes: REGION_FALLBACK_LABEL,
  };

  return {
    tier: "closed",
    label: "Closed",
    detail: REGION_FALLBACK_LABEL,
    schedule,
    openUntil: null,
    boostedAt: null,
    isRegionFallback: true,
  };
}
