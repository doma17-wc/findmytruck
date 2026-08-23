"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
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
  signedIn: boolean;
  favoritedIds: string[];
}

export default function HomeClient({ initialStops, signedIn, favoritedIds }: HomeClientProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [query, setQuery] = useState("");

  const favoritedSet = useMemo(() => new Set(favoritedIds), [favoritedIds]);

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

  const filteredStops = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialStops;
    return initialStops.filter(
      (s) =>
        s.truck.name.toLowerCase().includes(q) ||
        s.truck.cuisine_type.some((c) => c.toLowerCase().includes(q))
    );
  }, [initialStops, query]);

  const referencePoint = userLocation ?? ZURICH_CENTER;

  const sortedStops = useMemo(() => {
    return [...filteredStops].sort((a, b) => {
      const aOpen = isNowWithin(a.schedule.start_time, a.schedule.end_time, now);
      const bOpen = isNowWithin(b.schedule.start_time, b.schedule.end_time, now);
      if (aOpen !== bOpen) return aOpen ? -1 : 1;

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
  }, [filteredStops, referencePoint, now]);

  const openCount = sortedStops.filter((s) =>
    isNowWithin(s.schedule.start_time, s.schedule.end_time, now)
  ).length;

  return (
    <div className="flex flex-col">
      <div className="relative h-[62vh] w-full sm:h-[68vh]">
        <TruckMap
          stops={sortedStops}
          userLocation={userLocation}
          selectedTruckId={selectedTruckId}
          onSelectTruck={setSelectedTruckId}
          now={now}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center px-4 pt-4">
          <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-2xl border border-white/40 bg-white/75 px-4 py-3 shadow-lg backdrop-blur-md transition focus-within:bg-white/90">
            <Search className="h-4 w-4 flex-shrink-0 text-neutral-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search trucks or cuisines…"
              className="w-full bg-transparent text-[15px] text-neutral-900 placeholder:text-neutral-500 focus:outline-none"
            />
          </div>
        </div>

        {locationDenied && (
          <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-neutral-600 shadow">
            Showing Zurich · enable location for distances
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-neutral-900">
            Today&apos;s trucks {sortedStops.length > 0 && `(${sortedStops.length})`}
          </h2>
          {sortedStops.length > 0 && (
            <span className="text-sm font-semibold text-green-600">{openCount} open now</span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedStops.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-neutral-500">
              No trucks match &quot;{query}&quot; right now.
            </p>
          ) : (
            sortedStops.map((stop) => (
              <TruckListItem
                key={stop.schedule.id}
                stop={stop}
                isOpen={isNowWithin(stop.schedule.start_time, stop.schedule.end_time, now)}
                signedIn={signedIn}
                isFavorited={favoritedSet.has(stop.truck.id)}
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
