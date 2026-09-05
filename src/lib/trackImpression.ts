import { createClient } from "@/lib/supabase/client";

const SESSION_KEY = "fmt_impressed_trucks";
const FLUSH_INTERVAL_MS = 5000;

let pending = new Set<string>();
let seen: Set<string> | null = null;
let lifecycleStarted = false;

function getSeen(): Set<string> {
  if (seen) return seen;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    seen = new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    seen = new Set<string>();
  }
  return seen;
}

function persistSeen() {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...getSeen()]));
  } catch {
    // Storage unavailable (private browsing, etc.) -- impressions still get
    // sent for this page load, just without cross-page-load de-dup.
  }
}

function flush() {
  if (pending.size === 0) return;
  const truckIds = [...pending];
  pending = new Set();
  void createClient()
    .rpc("increment_truck_impression", { p_truck_ids: truckIds })
    .then(({ error }) => {
      if (error) console.error("[trackImpression] flush failed:", error.message);
    });
}

function ensureLifecycle() {
  if (lifecycleStarted || typeof window === "undefined") return;
  lifecycleStarted = true;
  setInterval(flush, FLUSH_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);
}

/** Records a truck card impression (genuinely scrolled into view, per the
 * IntersectionObserver in useImpressionRef) once per truck per browser tab
 * session, skipping the truck's own owner. Impressions are accumulated in
 * memory and flushed in a single batched RPC call every few seconds (and on
 * tab hide/unload) rather than firing one request per card. */
export function recordTruckImpression(truckId: string, isOwnerView: boolean): void {
  if (isOwnerView || typeof window === "undefined") return;

  const seenSet = getSeen();
  if (seenSet.has(truckId)) return;
  seenSet.add(truckId);
  persistSeen();

  pending.add(truckId);
  ensureLifecycle();
}
