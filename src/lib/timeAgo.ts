/** Friendly "time ago" label (e.g. "2 days ago", "just now"), for owner
 *  engagement stats in the dashboard and admin. Not locale-aware -- English
 *  only, matching the rest of the admin/dashboard UI copy. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "just now";

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (ms < minute) return "just now";
  if (ms < hour) {
    const m = Math.floor(ms / minute);
    return `${m} minute${m === 1 ? "" : "s"} ago`;
  }
  if (ms < day) {
    const h = Math.floor(ms / hour);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  const d = Math.floor(ms / day);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  const months = Math.floor(d / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}
