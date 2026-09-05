import type { TruckSchedule } from "./types";
import { DAY_LABELS, DAY_LABELS_SHORT } from "./types";

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

/**
 * The single source of truth for how a truck reads on the map, the list, the
 * browse grid and the detail panel. Exactly one of three tiers:
 *
 *   "boosted"  the owner pressed "Boost" and the boost has not expired yet.
 *              Bright green, larger pin, pulsing ring, top of the list.
 *   "open"     a weekly schedule slot is active right now (no action needed).
 *              Soft green pin, normal size, below boosted trucks.
 *   "closed"   neither of the above. Grey pin, bottom of the list.
 */
export type TruckTier = "boosted" | "open" | "closed";

/** Boost state read off a truck row (`trucks` / `public_trucks`). */
export interface BoostInfo {
  boosted: boolean;
  expiresAt: Date | null;
  startedAt: Date | null;
  lat: number | null;
  lng: number | null;
}

export interface TruckStatus {
  tier: TruckTier;
  /** Badge word: "Boosted" | "Open" | "Closed". */
  label: string;
  /** Secondary line, e.g. "Open until 14:00", "Opens Tue 11:30",
   *  "Confirmed 5 min ago" — or null when there's nothing to add. */
  detail: string | null;
  /** The schedule entry to use for the map pin / location display. */
  schedule: TruckSchedule | null;
  /** "HH:MM" the current service ends (boosted/open with an active slot). */
  openUntil: string | null;
  /** When the owner pressed Boost, for the "confirmed X ago" line. */
  boostedAt: Date | null;
  /** True when `schedule` is a synthetic entry placing the truck at its
   * region centre because it has no real schedule yet (imported profile). */
  isRegionFallback?: boolean;
}

type BoostSource = {
  boosted?: boolean | null;
  boost_expires_at?: string | null;
  boost_started_at?: string | null;
  boost_lat?: number | null;
  boost_lng?: number | null;
};

/** Normalise the raw boost columns off a truck row into a {@link BoostInfo}. */
export function readBoost(t: BoostSource): BoostInfo {
  return {
    boosted: Boolean(t.boosted),
    expiresAt: t.boost_expires_at ? new Date(t.boost_expires_at) : null,
    startedAt: t.boost_started_at ? new Date(t.boost_started_at) : null,
    lat: typeof t.boost_lat === "number" ? t.boost_lat : null,
    lng: typeof t.boost_lng === "number" ? t.boost_lng : null,
  };
}

/** A boost only counts while it hasn't expired — computed on read, no cron. */
export function isBoostActive(boost: BoostInfo | null, now: Date = new Date()): boolean {
  return Boolean(boost?.boosted && boost.expiresAt && now < boost.expiresAt);
}

/** "Confirmed just now" / "Confirmed 12 min ago" / "Confirmed 2h ago". */
export function confirmedAgo(startedAt: Date | null, now: Date = new Date()): string {
  if (!startedAt) return "Confirmed now";
  const mins = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 60000));
  if (mins < 1) return "Confirmed just now";
  if (mins < 60) return `Confirmed ${mins} min ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `Confirmed ${h}h ${m}m ago` : `Confirmed ${h}h ago`;
}

/** ISO-8601 week number (1-53) for a date, matching the "even/odd week" the
 *  frequency system talks about. */
export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1 .. Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Which occurrence (1-based) of its weekday this date is within its month,
 *  e.g. the third Friday of the month returns 3. */
export function occurrenceOfWeekdayInMonth(date: Date): number {
  return Math.ceil(date.getDate() / 7);
}

/** Whether a (possibly non-weekly) recurring schedule row actually runs on
 *  `date`. Dated rows (`specific_date` set) are handled by the caller and
 *  always occur on their one date -- this only covers the recurring-frequency
 *  cases layered on top of the plain weekly match. */
function occursOn(schedule: TruckSchedule, date: Date): boolean {
  const frequency = schedule.frequency ?? "weekly";
  if (frequency === "alternate") {
    const parity = getISOWeek(date) % 2 === 0 ? "even" : "odd";
    return parity === (schedule.frequency_parity ?? "odd");
  }
  if (frequency === "monthly_weeks") {
    const weeks = schedule.frequency_weeks ?? [];
    return weeks.includes(occurrenceOfWeekdayInMonth(date));
  }
  return true;
}

/** A truck's schedule slot that is active at `now` (recurring or dated). */
function activeSlot(schedules: TruckSchedule[], now: Date): TruckSchedule | null {
  const todayIdx = getMondayFirstDay(now);
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
  return (
    schedules.find((s) => {
      if (s.start_time === s.end_time) return false; // region-marker placeholder
      const onToday = s.specific_date
        ? s.specific_date === todayISO
        : s.day_of_week === todayIdx && occursOn(s, now);
      return onToday && isNowWithin(s.start_time, s.end_time, now);
    }) ?? null
  );
}

/** The soonest recurring slot from `now` onward, with how many days away it is.
 *  Scans forward day-by-day (rather than assuming "same weekday next week" is
 *  always valid) since alternate/monthly-week frequencies mean a matching
 *  weekday doesn't necessarily occur every week. */
function nextSlot(
  schedules: TruckSchedule[],
  now: Date
): { schedule: TruckSchedule; daysAhead: number } | null {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const weekly = schedules.filter((s) => s.start_time !== s.end_time && s.specific_date == null);
  if (weekly.length === 0) return null;

  for (let daysAhead = 0; daysAhead <= 35; daysAhead++) {
    const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead);
    const candidateDow = getMondayFirstDay(candidate);
    const matches = weekly
      .filter((s) => s.day_of_week === candidateDow && occursOn(s, candidate))
      .filter((s) => daysAhead > 0 || timeToMinutes(s.start_time) > nowMinutes)
      .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    if (matches.length > 0) return { schedule: matches[0], daysAhead };
  }
  return null;
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Derive a truck's three-tier status. Always computed from the FULL weekly
 * schedule (not just today's) so a truck scheduled on other days still gets a
 * pin and an "Opens …" label instead of vanishing.
 */
export function computeTruckStatus(
  schedules: TruckSchedule[],
  now: Date = new Date(),
  boost: BoostInfo | null = null
): TruckStatus {
  const active = activeSlot(schedules, now);
  const upcoming = nextSlot(schedules, now);

  if (isBoostActive(boost, now)) {
    const base = active ?? upcoming?.schedule ?? null;
    const hasGps = boost!.lat != null && boost!.lng != null;
    const pin: TruckSchedule | null = hasGps
      ? {
          id: `boost-${base?.truck_id ?? "x"}`,
          truck_id: base?.truck_id ?? "",
          day_of_week: getMondayFirstDay(now),
          location_name: base?.location_name ?? "Confirmed location",
          location_lat: boost!.lat as number,
          location_lng: boost!.lng as number,
          start_time: base?.start_time ?? "00:00:00",
          end_time: base?.end_time ?? "23:59:00",
          is_recurring: false,
          specific_date: null,
          notes: "boost",
        }
      : base;
    const until = active
      ? active.end_time.slice(0, 5)
      : boost!.expiresAt
      ? hhmm(boost!.expiresAt)
      : null;
    return {
      tier: "boosted",
      label: "Boosted",
      detail: confirmedAgo(boost!.startedAt, now),
      schedule: pin,
      openUntil: until,
      boostedAt: boost!.startedAt,
    };
  }

  if (active) {
    return {
      tier: "open",
      label: "Open",
      detail: `Open until ${active.end_time.slice(0, 5)}`,
      schedule: active,
      openUntil: active.end_time.slice(0, 5),
      boostedAt: null,
    };
  }

  if (!upcoming) {
    return { tier: "closed", label: "Closed", detail: null, schedule: null, openUntil: null, boostedAt: null };
  }

  const at = upcoming.schedule.start_time.slice(0, 5);
  const detail =
    upcoming.daysAhead === 0
      ? `Opens at ${at}`
      : upcoming.daysAhead === 1
      ? `Opens tomorrow ${at}`
      : upcoming.daysAhead < 7
      ? `Opens ${DAY_LABELS_SHORT[upcoming.schedule.day_of_week]} ${at}`
      : `Opens ${DAY_LABELS[upcoming.schedule.day_of_week]} ${at}`;

  return {
    tier: "closed",
    label: "Closed",
    detail,
    schedule: upcoming.schedule,
    openUntil: null,
    boostedAt: null,
  };
}
