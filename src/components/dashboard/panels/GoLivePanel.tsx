"use client";

import { useMemo, useState, useTransition } from "react";
import { Info, LocateFixed, Loader2 } from "lucide-react";
import type { Truck, TruckSchedule } from "@/lib/types";
import { Card, CardBody, useToast, dashInput, cn } from "../ui";
import LiveHero from "../LiveHero";
import { goLiveAction, endServiceAction } from "@/app/dashboard/actions";

interface Props {
  truck: Truck;
  schedules: TruckSchedule[];
  liveRow: TruckSchedule | null;
}

const CURRENT = "__current__";

export default function GoLivePanel({ schedules, liveRow }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const live = Boolean(liveRow);

  const pitches = useMemo(() => {
    const seen = new Map<string, TruckSchedule>();
    for (const s of schedules) {
      if (s.specific_date) continue;
      if (!seen.has(s.location_name)) seen.set(s.location_name, s);
    }
    return [...seen.values()];
  }, [schedules]);

  const [pitch, setPitch] = useState<string>(pitches[0]?.location_name ?? CURRENT);
  const [until, setUntil] = useState("14:00");
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const resolveLocation = (): Promise<{ name: string; lat: number; lng: number }> => {
    if (pitch !== CURRENT) {
      const match = pitches.find((p) => p.location_name === pitch);
      if (match) {
        return Promise.resolve({
          name: match.location_name,
          lat: match.location_lat,
          lng: match.location_lng,
        });
      }
    }
    setLocating(true);
    setGeoError(null);
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Location not available on this device"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false);
          resolve({
            name: "Current location",
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          setLocating(false);
          reject(new Error("Couldn't get your location — allow location access and retry"));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleGoLive = async () => {
    let loc;
    try {
      loc = await resolveLocation();
    } catch (e) {
      setGeoError(e instanceof Error ? e.message : "Location error");
      return;
    }
    startTransition(async () => {
      const res = await goLiveAction({
        locationName: loc.name,
        lat: loc.lat,
        lng: loc.lng,
        servingUntil: until,
      });
      if (res.error) toast(res.error, "error");
      else toast("You're live — your pin is on the map");
    });
  };

  const handleEnd = () => {
    startTransition(async () => {
      const res = await endServiceAction();
      if (res.error) toast(res.error, "error");
      else toast("Service ended");
    });
  };

  return (
    <div className="space-y-6">
      <LiveHero live={live} liveRow={liveRow}>
        {live ? (
          <button
            type="button"
            onClick={handleEnd}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-ink transition hover:bg-white/90 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            End service
          </button>
        ) : (
          <p className="text-sm text-white/60">Set your pitch below, then go live.</p>
        )}
      </LiveHero>

      {!live && (
        <Card>
          <CardBody className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">Current pitch</span>
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

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">Serving until</span>
              <input
                type="time"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                className={cn(dashInput, "font-mono")}
              />
            </label>

            {geoError && <p className="text-sm text-accent-dark">{geoError}</p>}

            <button
              type="button"
              onClick={handleGoLive}
              disabled={pending || locating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-accent-dark disabled:opacity-60 sm:w-auto"
            >
              {(pending || locating) && <Loader2 className="h-4 w-4 animate-spin" />}
              {pitch === CURRENT && <LocateFixed className="h-4 w-4" />}
              Go live
            </button>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="flex gap-3">
          <Info className="h-5 w-5 flex-shrink-0 text-blue" />
          <div className="text-sm text-ink-soft">
            <p className="font-semibold text-ink">How going live works</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-muted">
              <li>Going live puts your truck pin on the public map at the pitch you pick.</li>
              <li>Your profile shows an &ldquo;Open now&rdquo; badge until your serving-until time.</li>
              <li>Ending service removes the live pin. Your regular tour schedule stays intact.</li>
            </ul>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
