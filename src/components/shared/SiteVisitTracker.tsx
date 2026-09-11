"use client";

import { useEffect } from "react";
import { recordSiteVisit } from "@/lib/trackVisit";

/** Invisible, site-wide: records one aggregate "session today" tick for
 * admin's traffic trends. Mounted once in the root layout. */
export default function SiteVisitTracker() {
  useEffect(() => {
    recordSiteVisit();
  }, []);

  return null;
}
