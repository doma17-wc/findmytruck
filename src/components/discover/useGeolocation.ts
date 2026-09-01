"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Geolocation state machine for the discovery page.
 *
 *   idle        – nothing requested yet
 *   locating    – a getCurrentPosition() call is in flight (show a spinner)
 *   granted     – we have a fix in `coords` ([lng, lat])
 *   denied      – the user or the browser blocked us (needs a settings change)
 *   unavailable – no geolocation API, or the OS couldn't resolve a position
 *   timeout     – the request took too long; the user can retry
 *
 * Every transition is logged with a `[geo]` prefix so failures are debuggable
 * from the browser console on both localhost and the live site.
 */
export type GeoStatus =
  | "idle"
  | "locating"
  | "granted"
  | "denied"
  | "unavailable"
  | "timeout";

export interface GeoState {
  /** [lng, lat] — matches the [lng, lat] convention used across the map code. */
  coords: [number, number] | null;
  accuracy: number | null;
  status: GeoStatus;
  /** Manually (re)trigger a location request — wired to the "Use my location" buttons. */
  request: () => void;
}

const LOG = "[geo]";

export function useGeolocation(auto = true): GeoState {
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [status, setStatus] = useState<GeoStatus>("idle");
  const autoTriedRef = useRef(false);

  const locate = useCallback((highAccuracy: boolean) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      console.warn(LOG, "navigator.geolocation is not available");
      setStatus("unavailable");
      return;
    }
    if (!window.isSecureContext) {
      // getCurrentPosition silently no-ops on insecure origins in modern browsers.
      console.warn(
        LOG,
        "insecure context — geolocation needs HTTPS (works on localhost + findmytruck.ch)"
      );
    }

    console.info(LOG, "getCurrentPosition()", { highAccuracy });
    setStatus("locating");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        console.info(
          LOG,
          `fix: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (±${Math.round(acc)}m)`
        );
        setCoords([longitude, latitude]);
        setAccuracy(acc);
        setStatus("granted");
      },
      (err) => {
        console.warn(LOG, `error code=${err.code} (${err.message || "no message"})`);
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
        } else if (err.code === err.TIMEOUT) {
          if (!highAccuracy) {
            console.info(LOG, "timeout — retrying once with high accuracy");
            locate(true);
          } else {
            setStatus("timeout");
          }
        } else {
          // POSITION_UNAVAILABLE
          setStatus("unavailable");
        }
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: highAccuracy ? 20000 : 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  const request = useCallback(() => locate(false), [locate]);

  useEffect(() => {
    if (!auto || autoTriedRef.current) return;
    autoTriedRef.current = true;

    // Prefer the Permissions API: it lets us auto-locate silently when access is
    // already granted, skip the doomed call when it's denied, and react to the
    // user flipping the toggle in the browser's site settings.
    if (typeof navigator !== "undefined" && "permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((perm) => {
          console.info(LOG, "permission state:", perm.state);
          if (perm.state === "denied") setStatus("denied");
          else locate(false);

          perm.onchange = () => {
            console.info(LOG, "permission changed:", perm.state);
            if (perm.state === "granted") locate(false);
            else if (perm.state === "denied") setStatus("denied");
          };
        })
        .catch(() => locate(false));
    } else {
      locate(false);
    }
  }, [auto, locate]);

  return { coords, accuracy, status, request };
}
