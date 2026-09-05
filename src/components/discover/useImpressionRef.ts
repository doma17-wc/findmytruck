"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recordTruckImpression } from "@/lib/trackImpression";

const VISIBLE_RATIO = 0.5;
const VISIBLE_MS = 1000;

/** Callback ref that counts a genuine impression once a truck card is at
 * least 50% visible for a full second -- not just rendered in the DOM. */
export function useImpressionRef(truckId: string, isOwnerView: boolean) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  const ref = useCallback((el: HTMLElement | null) => {
    setNode(el);
  }, []);

  useEffect(() => {
    if (!node || firedRef.current || isOwnerView || typeof IntersectionObserver === "undefined") {
      return;
    }

    const clearTimer = () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO) {
          if (timerRef.current === null) {
            timerRef.current = setTimeout(() => {
              firedRef.current = true;
              recordTruckImpression(truckId, isOwnerView);
              observer.disconnect();
            }, VISIBLE_MS);
          }
        } else {
          clearTimer();
        }
      },
      { threshold: [0, VISIBLE_RATIO] }
    );

    observer.observe(node);
    return () => {
      clearTimer();
      observer.disconnect();
    };
  }, [node, truckId, isOwnerView]);

  return ref;
}
