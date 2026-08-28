import type { TruckSchedule } from "./types";
import { DAY_LABELS } from "./types";

/** Great-circle distance between two lat/lng points, in kilometers. */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** Returns 0 = Monday .. 6 = Sunday, matching the truck_schedules convention. */
export function getMondayFirstDay(date: Date = new Date()): number {
  const jsDay = date.getDay(); // 0 = Sun .. 6 = Sat
  return jsDay === 0 ? 6 : jsDay - 1;
}

/** "HH:MM" (or "HH:MM:SS") -> minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function isNowWithin(startTime: string, endTime: string, now: Date = new Date()): boolean {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= timeToMinutes(startTime) && nowMinutes <= timeToMinutes(endTime);
}

export function formatTimeRange(start: string, end: string): string {
  return `${start.slice(0, 5)} – ${end.slice(0, 5)}`;
}

export type TruckStatusState = "open" | "opens_today" | "next_day" | "none";

export interface TruckStatus {
  state: TruckStatusState;
  label: string;
  /** The schedule entry to use for the map pin / location display. */
  schedule: TruckSchedule | null;
  /** True when `schedule` is a synthetic entry placing the truck at its
   * region centre because it has no real schedule yet (imported profile). */
  isRegionFallback?: boolean;
}

/**
 * Status is always computed from the FULL set of a truck's schedule entries
 * (not just today's), so a truck scheduled on other days still gets a pin
 * and a "Next: ..." label instead of disappearing from the map entirely.
 */
export function computeTruckStatus(
  schedules: TruckSchedule[],
  now: Date = new Date()
): TruckStatus {
  if (schedules.length === 0) return { state: "none", label: "No schedule set", schedule: null };

  const todayIdx = getMondayFirstDay(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const today = schedules.filter((s) => s.day_of_week === todayIdx);

  const openNow = today.find((s) => isNowWithin(s.start_time, s.end_time, now));
  if (openNow) return { state: "open", label: "OPEN NOW", schedule: openNow };

  const upcomingToday = today
    .filter((s) => timeToMinutes(s.start_time) > nowMinutes)
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))[0];

  if (upcomingToday) {
    const diff = timeToMinutes(upcomingToday.start_time) - nowMinutes;
    const label =
      diff <= 180
        ? diff < 60
          ? `Opens in ${diff}m`
          : `Opens in ${Math.round(diff / 60)}h`
        : `Opens at ${upcomingToday.start_time.slice(0, 5)}`;
    return { state: "opens_today", label, schedule: upcomingToday };
  }

  // No slot left today (or none today at all) — find the next upcoming day.
  let best: { schedule: TruckSchedule; daysAhead: number } | null = null;
  for (const s of schedules) {
    let daysAhead = (s.day_of_week - todayIdx + 7) % 7;
    if (daysAhead === 0) daysAhead = 7; // today's slots already ended
    if (
      !best ||
      daysAhead < best.daysAhead ||
      (daysAhead === best.daysAhead && timeToMinutes(s.start_time) < timeToMinutes(best.schedule.start_time))
    ) {
      best = { schedule: s, daysAhead };
    }
  }

  if (!best) return { state: "none", label: "No schedule set", schedule: null };
  return {
    state: "next_day",
    label: `Next: ${DAY_LABELS[best.schedule.day_of_week]} ${best.schedule.start_time.slice(0, 5)}`,
    schedule: best.schedule,
  };
}
