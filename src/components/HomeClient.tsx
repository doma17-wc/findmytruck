"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import type { TruckWithSchedules } from "@/lib/data";
import { distanceKm, computeTruckStatus, type TruckStatus } from "@/lib/geo";
import { DEFAULT_MAP_CENTER } from "@/lib/cities";
import TruckListItem from "./TruckListItem";

const TruckMap = dynamic(() => import("./TruckMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-400">
      Loading map…
    </div>
  ),
});

const STATE_PRIORITY: Record<TruckStatus["state"], number> = {
  open: 0,
  opens_today: 1,
  next_day: 2,
  none: 3,
};

export interface TruckStatusEntry {
  truck: TruckWithSchedules["truck"];
  status: TruckStatus;
}

interface HomeClientProps {
  initialTrucks: TruckWithSchedules[];
  signedIn: boolean;
  favoritedIds: string[];
}

export default function HomeClient({ initialTrucks, signedIn, favoritedIds }: HomeClientProps) {
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

  const filteredTrucks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialTrucks;
    return initialTrucks.filter(
      ({ truck }) =>
        truck.name.toLowerCase().includes(q) ||
        truck.cuisine_type.some((c) => c.toLowerCase().includes(q))
    );
  }, [initialTrucks, query]);

  const referencePoint = userLocation ?? DEFAULT_MAP_CENTER;

  // Only trucks that have ever been scheduled somewhere can get a pin/card.
  const withStatus: TruckStatusEntry[] = useMemo(() => {
    return filteredTrucks
      .map(({ truck, schedules }) => ({ truck, status: computeTruckStatus(schedules, now) }))
      .filter((entry) => entry.status.schedule !== null);
  }, [filteredTrucks, now]);

  const sortedTrucks = useMemo(() => {
    return [...withStatus].sort((a, b) => {
      const pa = STATE_PRIORITY[a.status.state];
      const pb = STATE_PRIORITY[b.status.state];
      if (pa !== pb) return pa - pb;

      const da = distanceKm(
        referencePoint[1],
        referencePoint[0],
        a.status.schedule!.location_lat,
        a.status.schedule!.location_lng
      );
      const db = distanceKm(
        referencePoint[1],
        referencePoint[0],
        b.status.schedule!.location_lat,
        b.status.schedule!.location_lng
      );
      return da - db;
    });
  }, [withStatus, referencePoint]);

  const openCount = sortedTrucks.filter((t) => t.status.state === "open").length;

  return (
    <div className="flex flex-col">
      <div className="relative h-[62vh] w-full sm:h-[68vh]">
        <TruckMap
          trucks={sortedTrucks}
          userLocation={userLocation}
          selectedTruckId={selectedTruckId}
          onSelectTruck={setSelectedTruckId}
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
            Showing all trucks · enable location for distances
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-neutral-900">
            Trucks {sortedTrucks.length > 0 && `(${sortedTrucks.length})`}
          </h2>
          {openCount > 0 && (
            <span className="text-sm font-semibold text-green-600">{openCount} open now</span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedTrucks.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-neutral-500">
              No trucks match &quot;{query}&quot;.
            </p>
          ) : (
            sortedTrucks.map(({ truck, status }) => (
              <TruckListItem
                key={truck.id}
                truck={truck}
                status={status}
                signedIn={signedIn}
                isFavorited={favoritedSet.has(truck.id)}
                distanceKm={
                  userLocation
                    ? distanceKm(
                        userLocation[1],
                        userLocation[0],
                        status.schedule!.location_lat,
                        status.schedule!.location_lng
                      )
                    : null
                }
                onSelect={() => setSelectedTruckId(truck.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
