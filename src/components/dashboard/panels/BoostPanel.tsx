"use client";

import { useMemo, useState, useTransition } from "react";
import { Info, LocateFixed, Loader2, Zap } from "lucide-react";
import type { Truck, TruckSchedule } from "@/lib/types";
import { Card, CardBody, useToast, dashInput } from "../ui";
import BoostHero from "../BoostHero";
import { boostAction, endBoostAction } from "@/app/dashboard/actions";

interface Props {
  truck: Truck;
  schedules: TruckSchedule[];
  boosted: boolean;
  boostExpiresAt: string | null;
  boostStartedAt: string | null;
}

const CURRENT = "__current__";

export default function BoostPanel({
  schedules,
  boosted,
  boostExpiresAt,
  boostStartedAt,
}: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const pitches = useMemo(() => {
    const seen = new Map<string, TruckSchedule>();
    for (const s of schedules) {
      if (s.specific_date) continue;
      if (s.start_time === s.end_time) continue;
      if (!seen.has(s.location_name)) seen.set(s.location_name, s);
    }
    return [...seen.values()];
  }, [schedules]);

  const [pitch, setPitch] = useState<string>(pitches[0]?.location_name ?? CURRENT);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const activePitch = pitches.find((p) => p.location_name === pitch) ?? null;

  const resolveLocation = (): Promise<{ lat: number | null; lng: number | null }> => {
    if (pitch !== CURRENT && activePitch) {
      // Use the scheduled pitch coords — no GPS needed.
      return Promise.resolve({ lat: activePitch.location_lat, lng: activePitch.location_lng });
    }
    setLocating(true);
    setGeoError(null);
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        setLocating(false);
        reject(new Error("Location not available on this device"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setLocating(false);
          reject(new Error("Couldn't get your location — allow location access and retry"));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleBoost = async () => {
    let loc: { lat: number | null; lng: number | null };
    try {
      loc = await resolveLocation();
    } catch (e) {
      setGeoError(e instanceof Error ? e.message : "Location error");
      return;
    }
    startTransition(async () => {
      const res = await boostAction({ lat: loc.lat, lng: loc.lng });
      if (res.error) toast(res.error, "error");
      else toast("Boosted — you're at the top of the map");
    });
  };

  const handleEnd = () => {
    startTransition(async () => {
      const res = await endBoostAction();
      if (res.error) toast(res.error, "error");
      else toast("Boost ended");
    });
  };

  return (
    <div className="space-y-6">
      <BoostHero boosted={boosted} startedAt={boostStartedAt} expiresAt={boostExpiresAt}>
        {boosted ? (
          <button
            type="button"
            onClick={handleEnd}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-ink transition hover:bg-white/90 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            End boost
          </button>
        ) : (
          <p className="text-sm text-white/60">Pick where you&apos;re parked, then boost.</p>
        )}
      </BoostHero>

      {!boosted && (
        <Card>
          <CardBody className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">
                Where are you right now?
              </span>
              <select
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                className={dashInput}
              >
                {pitches.map((p) => (
                  <option key={p.location_name} value={p.location_name}>
                    {p.location_name}
                  </option>
                ))}
                <option value={CURRENT}>Use my current location</option>
              </select>
            </label>

            {geoError && <p className="text-sm text-accent-dark">{geoError}</p>}

            <button
              type="button"
              onClick={handleBoost}
              disabled={pending || locating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-accent-dark disabled:opacity-60 sm:w-auto"
            >
              {pending || locating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : pitch === CURRENT ? (
                <LocateFixed className="h-4 w-4" />
              ) : (
                <Zap className="h-4 w-4" fill="currentColor" />
              )}
              Boost now
            </button>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="flex gap-3">
          <Info className="h-5 w-5 flex-shrink-0 text-blue" />
          <div className="text-sm text-ink-soft">
            <p className="font-semibold text-ink">How Boost works</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-muted">
              <li>
                Boost pushes your truck to the top of the map and marks you as confirmed live
                right now. Use it when you&apos;re set up and serving.
              </li>
              <li>
                Your pin turns bright green with a pulsing ring, above trucks that are only open
                by schedule.
              </li>
              <li>
                Boost turns off automatically at the end of today&apos;s scheduled slot (or after
                4 hours). You can end it early anytime.
              </li>
              <li>
                Trucks that are open by their weekly schedule already show as &ldquo;Open&rdquo;
                without boosting — Boost is the extra nudge.
              </li>
            </ul>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
