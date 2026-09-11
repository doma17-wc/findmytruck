import { createClient } from "@/lib/supabase/client";

/** Records a "someone looked closer" moment for one menu item or gallery
 * photo -- fired when a dish photo is zoomed or a gallery photo is opened in
 * the lightbox. Skips the truck's own owner, same as page views. Aggregate
 * daily counter (see truck_content_views), no per-visitor identifier. */
export function recordTruckContentView(
  truckId: string,
  contentType: "menu_item" | "photo",
  contentKey: string,
  isOwnerView: boolean
): void {
  if (isOwnerView || typeof window === "undefined" || !contentKey) return;

  void createClient()
    .rpc("increment_truck_content_view", {
      p_truck_id: truckId,
      p_content_type: contentType,
      p_content_key: contentKey.slice(0, 200),
    })
    .then(({ error }) => {
      if (error) console.error("[trackContentView] failed:", error.message);
    });
}
