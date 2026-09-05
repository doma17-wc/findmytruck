"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LocateFixed, MapPin, SlidersHorizontal } from "lucide-react";
import { distanceKm, type TruckTier } from "@/lib/geo";
import BrowseCard from "./BrowseCard";
import { CUISINE_CHIPS, matchesCuisine } from "./helpers";
import type { DiscoverEntry } from "./types";
import type { GeoStatus } from "./useGeolocation";

/** Boosted trucks first, then open-by-schedule, then closed. */
const TIER_PRIORITY: Record<TruckTier, number> = { boosted: 0, open: 1, closed: 2 };

type StatusFilter = "all" | "open" | "closed";
type BrowseSort = "distance" | "rating" | "name" | "recent";
/** Radius in km; 0 means "Any". */
type DistanceFilter = 0 | 2 | 5 | 10 | 20;

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open now" },
  { key: "closed", label: "Closed" },
];

const DISTANCE_OPTIONS: { value: DistanceFilter; label: string }[] = [
  { value: 2, label: "2 km" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 20, label: "20 km" },
  { value: 0, label: "Any" },
];

interface BrowseAllProps {
  entries: DiscoverEntry[];
  signedIn: boolean;
  favoritedSet: Set<string>;
  ownTruckId: string | null;
  userLocation: [number, number] | null;
  geoStatus: GeoStatus;
  onRequestLocation: () => void;
  onSelect: (id: string) => void;
}

export default function BrowseAll({
  entries,
  signedIn,
  favoritedSet,
  ownTruckId,
  userLocation,
  geoStatus,
  onRequestLocation,
  onSelect,
}: BrowseAllProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [cuisines, setCuisines] = useState<Set<string>>(new Set());
  const [distance, setDistance] = useState<DistanceFilter>(0);
  const [sort, setSort] = useState<BrowseSort>("rating");
  const touchedSortRef = useRef(false);

  const hasLocation = userLocation !== null;

  // Snap to distance sorting the first time a location comes in (unless the user
  // has already picked a sort), and away from it if location access is lost.
  useEffect(() => {
    if (hasLocation && !touchedSortRef.current) setSort("distance");
    if (!hasLocation) setSort((s) => (s === "distance" ? "rating" : s));
  }, [hasLocation]);

  const withDist = useMemo(
    () =>
      entries.map((e) => ({
        entry: e,
        dist: userLocation
          ? distanceKm(userLocation[1], userLocation[0], e.coord[1], e.coord[0])
          : null,
      })),
    [entries, userLocation]
  );

  const filtered = useMemo(() => {
    return withDist.filter(({ entry, dist }) => {
      const available = entry.status.tier !== "closed";
      if (statusFilter === "open" && !available) return false;
      if (statusFilter === "closed" && available) return false;
      if (
        cuisines.size > 0 &&
        ![...cuisines].some((c) => matchesCuisine(entry.truck.cuisine_type, c))
      )
        return false;
      if (hasLocation && distance > 0 && (dist === null || dist > distance)) return false;
      return true;
    });
  }, [withDist, statusFilter, cuisines, distance, hasLocation]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      // Tier always wins: Boosted → Open → Closed. The chosen sort orders within.
      const pa = TIER_PRIORITY[a.entry.status.tier];
      const pb = TIER_PRIORITY[b.entry.status.tier];
      if (pa !== pb) return pa - pb;

      if (sort === "name") return a.entry.truck.name.localeCompare(b.entry.truck.name);
      if (sort === "recent") {
        return (b.entry.truck.updated_at ?? "").localeCompare(a.entry.truck.updated_at ?? "");
      }
      if (sort === "rating") {
        const ra = a.entry.rating?.avg ?? -1;
        const rb = b.entry.rating?.avg ?? -1;
        if (rb !== ra) return rb - ra;
        return (b.entry.rating?.count ?? 0) - (a.entry.rating?.count ?? 0);
      }
      // distance
      if (a.dist === null && b.dist === null) {
        return a.entry.truck.name.localeCompare(b.entry.truck.name);
      }
      if (a.dist === null) return 1;
      if (b.dist === null) return -1;
      return a.dist - b.dist;
    });
    return arr;
  }, [filtered, sort]);

  const total = entries.length;
  const showing = sorted.length;

  return (
    <section id="browse" className="scroll-mt-4 border-t border-line bg-paper-deep/30">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col gap-2">
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Browse all food trucks
          </h2>
          <p className="text-[14px] text-muted">
            {showing === total
              ? `${total} truck${total === 1 ? "" : "s"} across Switzerland`
              : `Showing ${showing} of ${total} trucks`}
          </p>
        </header>

        {/* Filter bar */}
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-line bg-card p-4 shadow-paper">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status segmented control */}
            <div className="inline-flex overflow-hidden rounded-full border border-line">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3.5 py-1.5 text-[13px] font-bold transition ${
                    statusFilter === tab.key
                      ? "bg-ink text-white"
                      : "bg-card text-ink-soft hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="relative">
              <SlidersHorizontal className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <select
                value={sort}
                onChange={(e) => {
                  touchedSortRef.current = true;
                  setSort(e.target.value as BrowseSort);
                }}
                className="appearance-none rounded-full border border-line bg-card py-1.5 pl-8 pr-8 text-[13px] font-semibold text-ink shadow-paper focus:border-brand-300 focus:outline-none"
              >
                {hasLocation && <option value="distance">Sort: Distance</option>}
                <option value="rating">Sort: Rating</option>
                <option value="name">Sort: Name</option>
                <option value="recent">Sort: Recently active</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            </div>

            {/* Distance filter — only meaningful with a location */}
            {hasLocation ? (
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand" />
                <select
                  value={distance}
                  onChange={(e) => setDistance(Number(e.target.value) as DistanceFilter)}
                  className="appearance-none rounded-full border border-line bg-card py-1.5 pl-8 pr-8 text-[13px] font-semibold text-ink shadow-paper focus:border-brand-300 focus:outline-none"
                >
                  {DISTANCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.value === 0 ? "Any distance" : `Within ${o.label}`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              </div>
            ) : (
              <button
                type="button"
                onClick={onRequestLocation}
                disabled={geoStatus === "locating"}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-1.5 text-[13px] font-semibold text-ink-soft shadow-paper transition hover:border-brand-300 hover:text-brand disabled:opacity-60"
              >
                <LocateFixed className="h-3.5 w-3.5" />
                {geoStatus === "locating"
                  ? "Locating…"
                  : geoStatus === "denied"
                  ? "Location blocked — enable in browser"
                  : "Enable location for distances"}
              </button>
            )}
          </div>

          {/* Cuisine chips */}
          <div className="flex flex-wrap gap-2">
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
                  className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition ${
                    active
                      ? "border-brand bg-brand text-white"
                      : "border-line bg-card text-ink-soft hover:border-brand-300"
                  }`}
                >
                  {chip}
                </button>
              );
            })}
            {cuisines.size > 0 && (
              <button
                type="button"
                onClick={() => setCuisines(new Set())}
                className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-muted underline-offset-2 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        {sorted.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted">
            No trucks match your filters.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map(({ entry, dist }) => (
              <BrowseCard
                key={entry.truck.id}
                entry={entry}
                signedIn={signedIn}
                favorited={favoritedSet.has(entry.truck.id)}
                distanceKm={hasLocation ? dist : null}
                isOwnerView={ownTruckId === entry.truck.id}
                onSelect={() => onSelect(entry.truck.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
