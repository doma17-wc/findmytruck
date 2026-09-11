import { createClient } from "@/lib/supabase/client";

const KEY_PREFIX = "fmt_site_visit_";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Records one aggregate "session today" tick for the whole site, deduped
 * per browser (localStorage, so it survives across tabs) per calendar day.
 * No identifiers are stored -- just a platform-wide daily counter used for
 * admin traffic trends. */
export function recordSiteVisit(): void {
  if (typeof window === "undefined") return;
  const key = KEY_PREFIX + todayStr();
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {
    // Storage unavailable -- still record this page load, just without dedup.
  }

  void createClient()
    .rpc("record_site_visit")
    .then(({ error }) => {
      if (error) console.error("[trackVisit] failed:", error.message);
    });
}

/** Records a cuisine filter chip being turned on, for admin's "most-searched
 * cuisines". Fires once per activation (not on deactivation). */
export function recordCuisineSearch(cuisine: string): void {
  if (typeof window === "undefined" || !cuisine) return;

  void createClient()
    .rpc("increment_cuisine_search", { p_cuisine: cuisine })
    .then(({ error }) => {
      if (error) console.error("[trackVisit] cuisine search failed:", error.message);
    });
}
