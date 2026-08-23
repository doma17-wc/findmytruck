"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { TruckStop } from "@/lib/data";
import { distanceKm, isNowWithin } from "@/lib/geo";
import TruckListItem from "./TruckListItem";

const TruckMap = dynamic(() => import("./TruckMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-400">
      Loading map…
    </div>
  ),
});

const ZURICH_CENTER: [number, number] = [8.5417, 47.3769];

interface HomeClientProps {
  initialStops: TruckStop[];
}

export default function HomeClient({ initialStops }: HomeClientProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setLocationDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.longitude, pos.coords.latitude]),
      () => setLocationDenied(true),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const openStops = useMemo(
    () => initialStops.filter((s) => isNowWithin(s.schedule.start_time, s.schedule.end_time, now)),
    [initialStops, now]
  );

  const referencePoint = userLocation ?? ZURICH_CENTER;

  const sortedStops = useMemo(() => {
    return [...openStops].sort((a, b) => {
      const da = distanceKm(
        referencePoint[1],
        referencePoint[0],
        a.schedule.location_lat,
        a.schedule.location_lng
      );
      const db = distanceKm(
        referencePoint[1],
        referencePoint[0],
        b.schedule.location_lat,
        b.schedule.location_lng
      );
      return da - db;
    });
  }, [openStops, referencePoint]);

  return (
    <div className="flex h-dvh w-full flex-col">
      <header className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚚</span>
          <span className="text-lg font-bold text-neutral-900">
            Find<span className="text-brand">My</span>Truck
          </span>
        </div>
        <a
          href="/zurich"
          className="rounded-full px-3 py-1.5 text-sm font-medium text-neutral-600 active:bg-neutral-100"
        >
          Zurich
        </a>
      </header>

      <div className="relative h-[55vh] w-full flex-shrink-0 sm:h-[65vh]">
        <TruckMap
          stops={sortedStops}
          userLocation={userLocation}
          selectedTruckId={selectedTruckId}
          onSelectTruck={setSelectedTruckId}
        />
        {locationDenied && (
          <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-neutral-600 shadow">
            Showing Zurich · enable location for distances
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-base font-bold text-neutral-900">
            Open now {sortedStops.length > 0 && `(${sortedStops.length})`}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto pb-4">
          {sortedStops.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-500">
              No trucks are open right now. Check back during lunch hours!
            </p>
          ) : (
            sortedStops.map((stop) => (
              <TruckListItem
                key={stop.schedule.id}
                stop={stop}
                distanceKm={
                  userLocation
                    ? distanceKm(
                        userLocation[1],
                        userLocation[0],
                        stop.schedule.location_lat,
                        stop.schedule.location_lng
                      )
                    : null
                }
                onSelect={() => setSelectedTruckId(stop.truck.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
