"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, List, Map as MapIcon, Search, SlidersHorizontal } from "lucide-react";
import type { TruckWithSchedules } from "@/lib/data";
import { distanceKm } from "@/lib/geo";
import { CITY_LIST, DEFAULT_MAP_CENTER, CITIES } from "@/lib/cities";
import DiscoverHeader from "./DiscoverHeader";
import TruckCard from "./TruckCard";
import DetailSheet from "./DetailSheet";
import { buildEntries, CUISINE_CHIPS, matchesCuisine } from "./helpers";
import type { DiscoverEntry, SortKey, TruckRating } from "./types";
import type { AppProfile } from "@/lib/supabase/server";

const DiscoverMap = dynamic(() => import("./DiscoverMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-paper-deep text-muted">
      Loading map…
    </div>
  ),
});

const STATE_PRIORITY: Record<DiscoverEntry["status"]["state"], number> = {
  open: 0,
  opens_today: 1,
  next_day: 2,
  none: 3,
};

interface DiscoverClientProps {
  initialTrucks: TruckWithSchedules[];
  ratings: Record<string, TruckRating>;
  auth: { email: string; profile: AppProfile | null } | null;
  favoritedIds: string[];
}

export default function DiscoverClient({
  initialTrucks,
  ratings,
  auth,
  favoritedIds,
}: DiscoverClientProps) {
  const signedIn = Boolean(auth);
  const favoritedSet = useMemo(() => new Set(favoritedIds), [favoritedIds]);

  const [now, setNow] = useState(() => new Date());
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  const [query, setQuery] = useState("");
  const [citySlug, setCitySlug] = useState<string>("");
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [cuisines, setCuisines] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortKey>("distance");

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "list">("list");

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) return setLocationDenied(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.longitude, pos.coords.latitude]),
      () => setLocationDenied(true),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const allEntries = useMemo(
    () => buildEntries(initialTrucks, ratings, now),
    [initialTrucks, ratings, now]
  );

  const cityCenter: [number, number] | null = citySlug
    ? CITIES[citySlug]?.center ?? null
    : null;
  const referencePoint = userLocation ?? cityCenter ?? DEFAULT_MAP_CENTER;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEntries.filter(({ truck, status }) => {
      if (
        q &&
        !truck.name.toLowerCase().includes(q) &&
        !truck.cuisine_type.some((c) => c.toLowerCase().includes(q))
      )
        return false;
      if (openNowOnly && status.state !== "open") return false;
      if (cuisines.size > 0 && ![...cuisines].some((c) => matchesCuisine(truck.cuisine_type, c)))
        return false;
      if (cityCenter && status.schedule) {
        const d = distanceKm(
          cityCenter[1],
          cityCenter[0],
          status.schedule.location_lat,
          status.schedule.location_lng
        );
        if (d > 20) return false;
      }
      return true;
    });
  }, [allEntries, query, openNowOnly, cuisines, cityCenter]);

  const sorted = useMemo(() => {
    const withDist = filtered.map((e) => ({
      entry: e,
      dist: distanceKm(referencePoint[1], referencePoint[0], e.coord[1], e.coord[0]),
    }));
    withDist.sort((a, b) => {
      if (sort === "name") return a.entry.truck.name.localeCompare(b.entry.truck.name);
      if (sort === "rating") {
        const ra = a.entry.rating?.avg ?? -1;
        const rb = b.entry.rating?.avg ?? -1;
        if (rb !== ra) return rb - ra;
        return (b.entry.rating?.count ?? 0) - (a.entry.rating?.count ?? 0);
      }
      // distance — but keep open/soon trucks grouped ahead
      const pa = STATE_PRIORITY[a.entry.status.state];
      const pb = STATE_PRIORITY[b.entry.status.state];
      if (pa !== pb) return pa - pb;
      return a.dist - b.dist;
    });
    return withDist;
  }, [filtered, referencePoint, sort]);

  const liveCount = allEntries.filter((e) => e.live).length;
  const selectedEntry = selectedId
    ? allEntries.find((e) => e.truck.id === selectedId) ?? null
    : null;

  // Scroll the selected card into view (e.g. after a map pin click)
  useEffect(() => {
    if (!selectedId) return;
    cardRefs.current.get(selectedId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedId]);

  const mapEntries = useMemo(() => sorted.map((s) => s.entry), [sorted]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-paper font-sans text-ink">
      <DiscoverHeader auth={auth} />

      {/* Search row */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-line bg-paper px-4 py-2.5">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-line bg-card px-4 py-2 shadow-paper focus-within:border-brand-300">
          <Search className="h-4 w-4 flex-shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search trucks or cuisines…"
            className="w-full bg-transparent text-[14px] text-ink placeholder:text-muted focus:outline-none"
          />
        </div>
        <div className="relative">
          <select
            value={citySlug}
            onChange={(e) => setCitySlug(e.target.value)}
            className="appearance-none rounded-full border border-line bg-card py-2 pl-4 pr-9 text-[13px] font-semibold text-ink shadow-paper focus:border-brand-300 focus:outline-none"
          >
            <option value="">All cities</option>
            {CITY_LIST.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-line bg-paper px-4 py-2">
        <div className="no-scrollbar flex flex-1 items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setOpenNowOnly((v) => !v)}
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-bold transition ${
              openNowOnly
                ? "border-green-500 bg-green-500 text-white"
                : "border-line bg-card text-ink-soft hover:border-green-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                openNowOnly ? "bg-white" : "bg-green-500"
              }`}
            />
            Open now
          </button>

          {CUISINE_CHIPS.map((chip) => {
            const active = cuisines.has(chip);
            return (
              <button
                key={chip}
                type="button"
                onClick={() =>
                  setCuisines((prev) => {
                    const next = new Set(prev);
                    if (next.has(chip)) next.delete(chip);
                    else next.add(chip);
                    return next;
                  })
                }
                className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition ${
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-card text-ink-soft hover:border-brand-300"
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>

        <div className="relative flex-shrink-0">
          <SlidersHorizontal className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="appearance-none rounded-full border border-line bg-card py-1.5 pl-8 pr-8 text-[13px] font-semibold text-ink shadow-paper focus:border-brand-300 focus:outline-none"
          >
            <option value="distance">Distance</option>
            <option value="rating">Rating</option>
            <option value="name">Name</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        </div>
      </div>

      {/* Split view */}
      <div className="relative flex min-h-0 flex-1">
        <div
          className={`w-full flex-shrink-0 overflow-y-auto border-r border-line bg-paper-deep/40 md:w-[44%] md:max-w-[640px] ${
            mobileView === "list" ? "block" : "hidden"
          } md:block`}
        >
          <div className="flex items-center justify-between px-4 pb-1 pt-3">
            <p className="font-display text-sm font-bold text-ink">
              {sorted.length} truck{sorted.length === 1 ? "" : "s"}
              {citySlug && ` near ${CITIES[citySlug]?.name}`}
            </p>
            {liveCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-live">
                <span className="relative flex h-1.5 w-1.5 text-live">
                  <span className="live-beacon absolute inset-0" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-current" />
                </span>
                {liveCount} live
              </span>
            )}
          </div>

          {locationDenied && (
            <p className="mx-4 mt-1 rounded-lg bg-card px-3 py-1.5 text-[12px] text-muted">
              Enable location for distances — showing all trucks
            </p>
          )}

          <div className="space-y-3 p-4">
            {sorted.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted">
                No trucks match your filters.
              </p>
            ) : (
              sorted.map(({ entry, dist }) => (
                <TruckCard
                  key={entry.truck.id}
                  entry={entry}
                  now={now}
                  signedIn={signedIn}
                  favorited={favoritedSet.has(entry.truck.id)}
                  selected={selectedId === entry.truck.id}
                  distanceKm={userLocation ? dist : null}
                  onSelect={() => setSelectedId(entry.truck.id)}
                  onHover={(h) => setHoveredId(h ? entry.truck.id : null)}
                  ref={(el) => {
                    if (el) cardRefs.current.set(entry.truck.id, el);
                    else cardRefs.current.delete(entry.truck.id);
                  }}
                />
              ))
            )}
          </div>
        </div>

        <div
          className={`min-w-0 flex-1 ${
            mobileView === "map" ? "block" : "hidden"
          } md:block`}
        >
          <DiscoverMap
            entries={mapEntries}
            userLocation={userLocation}
            cityCenter={cityCenter}
            hoveredId={hoveredId}
            selectedId={selectedId}
            liveCount={liveCount}
            onHover={setHoveredId}
            onSelect={setSelectedId}
          />
        </div>

        <button
          type="button"
          onClick={() => setMobileView((v) => (v === "map" ? "list" : "map"))}
          className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white shadow-xl md:hidden"
        >
          {mobileView === "map" ? (
            <>
              <List className="h-4 w-4" /> List
            </>
          ) : (
            <>
              <MapIcon className="h-4 w-4" /> Map
            </>
          )}
        </button>
      </div>

      {selectedEntry && (
        <DetailSheet
          entry={selectedEntry}
          now={now}
          signedIn={signedIn}
          favorited={favoritedSet.has(selectedEntry.truck.id)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
