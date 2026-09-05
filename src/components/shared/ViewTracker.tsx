"use client";

import { useEffect } from "react";
import { recordTruckView } from "@/lib/trackView";

/** Invisible client-side hook that records a truck profile view on mount.
 * Rendered from server pages/sheets so the insert runs on the visitor's own
 * request instead of being tied to server render/caching. */
export default function ViewTracker({
  truckId,
  isOwnerView,
}: {
  truckId: string;
  isOwnerView: boolean;
}) {
  useEffect(() => {
    recordTruckView(truckId, isOwnerView);
  }, [truckId, isOwnerView]);

  return null;
}
