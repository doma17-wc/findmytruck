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
