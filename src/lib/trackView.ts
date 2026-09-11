import { createClient } from "@/lib/supabase/client";

const SESSION_KEY = "fmt_viewed_trucks";

/** Where a profile open originated -- surfaced to owners in Insights. */
export type ViewSource = "map" | "list" | "profile" | "qr";

/** Records a truck profile view once per browser tab session, skipping the
 * truck's own owner. Called from the client so the insert always runs on the
 * actual visitor's request -- a server-side fire-and-forget insert on an
 * ISR-cached page only fires on the rare request that regenerates the page,
 * which is why views were never being recorded. */
export function recordTruckView(
  truckId: string,
  isOwnerView: boolean,
  source: ViewSource = "profile"
): void {
  if (isOwnerView || typeof window === "undefined") return;

  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const seen: string[] = raw ? JSON.parse(raw) : [];
    if (seen.includes(truckId)) return;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...seen, truckId]));
  } catch {
    // Storage unavailable (private browsing, etc.) -- fall through and still
    // record the view, just without per-session de-dup.
  }

  void createClient()
    .from("truck_page_views")
    .insert({ truck_id: truckId, source })
    .then(({ error }) => {
      if (error) console.error("[trackView] insert failed:", error.message);
    });
}
