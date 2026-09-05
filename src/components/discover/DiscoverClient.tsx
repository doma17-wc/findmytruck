"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ChevronDown,
  List,
  LocateFixed,
  Map as MapIcon,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { TruckWithSchedules } from "@/lib/data";
import { distanceKm } from "@/lib/geo";
import { CITY_LIST, DEFAULT_MAP_CENTER, CITIES } from "@/lib/cities";
import DiscoverHeader from "./DiscoverHeader";
import TruckCard from "./TruckCard";
import DetailSheet from "./DetailSheet";
import BrowseAll from "./BrowseAll";
import { buildEntries, CUISINE_CHIPS, matchesCuisine } from "./helpers";
import type { SortKey, TruckRating } from "./types";
import type { TruckTier } from "@/lib/geo";
import { useGeolocation } from "./useGeolocation";
import type { AppProfile } from "@/lib/supabase/server";

const DiscoverMap = dynamic(() => import("./DiscoverMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-paper-deep text-muted">
      Loading map…
    </div>
  ),
});

/** Boosted trucks first, then open-by-schedule, then closed. */
const TIER_PRIORITY: Record<TruckTier, number> = {
  boosted: 0,
  open: 1,
  closed: 2,
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
  const ownTruckId = auth?.profile?.role === "truck_owner" ? auth.profile.truck_id : null;

  const [now, setNow] = useState(() => new Date());
  const {
    coords: userLocation,
    status: geoStatus,
    request: requestLocation,
  } = useGeolocation();
  const locationDenied = geoStatus === "denied" || geoStatus === "unavailable";

  const [query, setQuery] = useState("");
  const [citySlug, setCitySlug] = useState<string>("");
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [cuisines, setCuisines] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortKey>("distance");

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "list">("list");

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Set when a selection originates from the browse grid below the fold, so the
  // "sync selected card into view" effect doesn't yank the page back to the top.
  const skipCardScrollRef = useRef(false);

  const selectFromBrowse = (id: string) => {
    skipCardScrollRef.current = true;
    setSelectedId(id);
  };

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
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
      if (openNowOnly && status.tier === "closed") return false;
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
  }, [allEntries, query, openNowOnly, cuisines, cityCenter, now]);

  const sorted = useMemo(() => {
    const withDist = filtered.map((e) => ({
      entry: e,
      dist: distanceKm(referencePoint[1], referencePoint[0], e.coord[1], e.coord[0]),
    }));
    withDist.sort((a, b) => {
      // Tier always wins: Boosted → Open → Closed. The chosen sort orders within.
      const pa = TIER_PRIORITY[a.entry.status.tier];
      const pb = TIER_PRIORITY[b.entry.status.tier];
      if (pa !== pb) return pa - pb;

      if (sort === "name") return a.entry.truck.name.localeCompare(b.entry.truck.name);
      if (sort === "rating") {
        const ra = a.entry.rating?.avg ?? -1;
        const rb = b.entry.rating?.avg ?? -1;
        if (rb !== ra) return rb - ra;
        return (b.entry.rating?.count ?? 0) - (a.entry.rating?.count ?? 0);
      }
      return a.dist - b.dist;
    });
    return withDist;
  }, [filtered, referencePoint, sort]);

  const boostedCount = allEntries.filter((e) => e.status.tier === "boosted").length;
  const selectedEntry = selectedId
    ? allEntries.find((e) => e.truck.id === selectedId) ?? null
    : null;

  // Scroll the selected card into view (e.g. after a map pin click)
  useEffect(() => {
    if (!selectedId) return;
    if (skipCardScrollRef.current) {
      skipCardScrollRef.current = false;
      return;
    }
    cardRefs.current.get(selectedId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedId]);

  const mapEntries = useMemo(() => sorted.map((s) => s.entry), [sorted]);

  const scrollToBrowse = () => {
    document.getElementById("browse")?.scrollIntoView({ behavior: "smooth" });
  };

  const locateLabel =
    geoStatus === "locating"
      ? "Locating…"
      : userLocation
      ? "Located"
      : geoStatus === "denied"
      ? "Location blocked"
      : "Near me";

  return (
    <div className="min-h-[100dvh] bg-paper font-sans text-ink">
      {/* ---------- Top: synced split-view discovery (one viewport tall) ---------- */}
      <div className="flex h-[100dvh] flex-col overflow-hidden">
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

            <button
              type="button"
              onClick={requestLocation}
              disabled={geoStatus === "locating"}
              title={
                geoStatus === "denied"
                  ? "Location is blocked — enable it in your browser's site settings"
                  : "Use my location for distances and nearby sorting"
              }
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-bold transition disabled:opacity-60 ${
                userLocation
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-card text-ink-soft hover:border-brand-300"
              }`}
            >
              <LocateFixed className="h-3.5 w-3.5" />
              {locateLabel}
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
              {boostedCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-live">
                  <span className="relative flex h-1.5 w-1.5 text-live">
                    <span className="live-beacon absolute inset-0" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-current" />
                  </span>
                  {boostedCount} boosted
                </span>
              )}
            </div>

            {locationDenied && (
              <button
                type="button"
                onClick={requestLocation}
                className="mx-4 mt-1 block w-[calc(100%-2rem)] rounded-lg bg-card px-3 py-1.5 text-left text-[12px] text-muted hover:text-brand"
              >
                Enable location for distances — showing all trucks
              </button>
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
                    signedIn={signedIn}
                    favorited={favoritedSet.has(entry.truck.id)}
                    selected={selectedId === entry.truck.id}
                    distanceKm={userLocation ? dist : null}
                    isOwnerView={ownTruckId === entry.truck.id}
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
              boostedCount={boostedCount}
              onHover={setHoveredId}
              onSelect={setSelectedId}
              onRequestLocation={requestLocation}
            />
          </div>

          <button
            type="button"
            onClick={() => setMobileView((v) => (v === "map" ? "list" : "map"))}
            className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white shadow-xl md:hidden"
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

          {/* Scroll affordance to the browse directory (desktop) */}
          <button
            type="button"
            onClick={scrollToBrowse}
            className="absolute bottom-6 left-1/2 z-30 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-card/95 px-4 py-2.5 text-[13px] font-bold text-ink-soft shadow-xl backdrop-blur-sm transition hover:text-brand md:flex"
          >
            Browse all trucks
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ---------- Below the fold: full browsable directory ---------- */}
      <BrowseAll
        entries={allEntries}
        signedIn={signedIn}
        favoritedSet={favoritedSet}
        ownTruckId={ownTruckId}
        userLocation={userLocation}
        geoStatus={geoStatus}
        onRequestLocation={requestLocation}
        onSelect={selectFromBrowse}
      />

      {selectedEntry && (
        <DetailSheet
          entry={selectedEntry}
          now={now}
          signedIn={signedIn}
          favorited={favoritedSet.has(selectedEntry.truck.id)}
          isOwnerView={ownTruckId === selectedEntry.truck.id}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
