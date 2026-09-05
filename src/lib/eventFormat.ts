/** Shared date/time formatting for events (public pages, cards, detail). */

export function formatEventDateRange(
  start: string,
  end: string,
  opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }
): string {
  const s = new Date(`${start}T00:00:00`).toLocaleDateString("en", opts);
  if (start === end) return s;
  const e = new Date(`${end}T00:00:00`).toLocaleDateString("en", opts);
  return `${s} – ${e}`;
}

export function formatEventTime(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): string | null {
  if (!startTime) return null;
  const s = startTime.slice(0, 5);
  const e = (endTime ?? "").slice(0, 5);
  return e ? `${s}–${e}` : s;
}
