"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  ChevronDown,
  List,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { TruckWithSchedules } from "@/lib/data";
import type { EventWithTrucks } from "@/lib/types";
import { EVENT_TYPE_META, normalizeEventType } from "@/lib/types";
import { distanceKm } from "@/lib/geo";
import { dateStr } from "@/lib/events";
import { formatEventDateRange, formatEventTime } from "@/lib/eventFormat";
import { LangProvider, useLang, weekdayName, type Lang } from "@/lib/i18n";
import { CITY_LIST, DEFAULT_MAP_CENTER, CITIES } from "@/lib/cities";
import DiscoverHeader from "./DiscoverHeader";
import DaySelector from "./DaySelector";
import TruckCard from "./TruckCard";
import DetailSheet from "./DetailSheet";
import BrowseAll from "./BrowseAll";
import { buildDayEntries, buildEntries, CUISINE_CHIPS, matchesCuisine } from "./helpers";
import type { DiscoverEntry, SortKey, TruckRating } from "./types";

/** Identity of an entry for list keys / map markers / selection. One truck can
 *  produce several entries on a planned day (one per location it visits). */
const keyOf = (e: DiscoverEntry) => e.entryKey ?? e.truck.id;
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
  eventsByTruck?: Record<string, EventWithTrucks[]>;
  allEvents?: EventWithTrucks[];
  auth: { email: string; profile: AppProfile | null; ownedTruckIds?: string[] } | null;
  favoritedIds: string[];
  reviewsRequireLogin?: boolean;
}

export default function DiscoverClient(props: DiscoverClientProps) {
  return (
    <LangProvider>
      <DiscoverClientInner {...props} />
    </LangProvider>
  );
}

function DiscoverClientInner({
  initialTrucks,
  ratings,
  eventsByTruck = {},
  allEvents = [],
  auth,
  favoritedIds,
  reviewsRequireLogin = false,
}: DiscoverClientProps) {
  const { lang, t } = useLang();
  const router = useRouter();
  const signedIn = Boolean(auth);
  const favoritedSet = useMemo(() => new Set(favoritedIds), [favoritedIds]);
  const ownedTruckIds = new Set(auth?.ownedTruckIds ?? []);

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
  /** null = "Today" (live view); a Date = plan that specific day. */
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const isToday = selectedDate == null;

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

  // Live (today) entries — always built; also feeds the "Browse all" directory
  // below the fold, which stays a real-time view regardless of the day selector.
  const liveEntries = useMemo(
    () => buildEntries(initialTrucks, ratings, now, eventsByTruck),
    [initialTrucks, ratings, now, eventsByTruck]
  );

  // Entries for the chosen planned day (map + list at the top).
  const allEntries = useMemo(
    () =>
      isToday
        ? liveEntries
        : buildDayEntries(initialTrucks, ratings, selectedDate as Date, eventsByTruck),
    [isToday, liveEntries, initialTrucks, ratings, selectedDate, eventsByTruck]
  );

  // Events to surface: today → the nearest upcoming ones; a planned day → the
  // events actually happening on that date.
  const viewEvents = useMemo(() => {
    if (isToday) return allEvents.slice(0, 12);
    const iso = dateStr(selectedDate as Date);
    return allEvents.filter((e) => e.start_date <= iso && iso <= e.end_date);
  }, [isToday, allEvents, selectedDate]);

  const eventPins = useMemo(
    () =>
      isToday
        ? []
        : viewEvents.map((e) => ({
            id: e.id,
            name: e.name,
            coord: [e.location_lng, e.location_lat] as [number, number],
          })),
    [isToday, viewEvents]
  );

  const cityCenter: [number, number] | null = citySlug
    ? CITIES[citySlug]?.center ?? null
    : null;
  const referencePoint = userLocation ?? cityCenter ?? DEFAULT_MAP_CENTER;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEntries.filter(({ truck, status, coord }) => {
      if (
        q &&
        !truck.name.toLowerCase().includes(q) &&
        !truck.cuisine_type.some((c) => c.toLowerCase().includes(q))
      )
        return false;
      if (isToday && openNowOnly && status.tier === "closed") return false;
      if (cuisines.size > 0 && ![...cuisines].some((c) => matchesCuisine(truck.cuisine_type, c)))
        return false;
      if (cityCenter) {
        const d = distanceKm(cityCenter[1], cityCenter[0], coord[1], coord[0]);
        if (d > 20) return false;
      }
      return true;
    });
  }, [allEntries, query, isToday, openNowOnly, cuisines, cityCenter]);

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

  const boostedCount = isToday
    ? allEntries.filter((e) => e.status.tier === "boosted").length
    : 0;
  const selectedEntry = selectedId
    ? allEntries.find((e) => keyOf(e) === selectedId) ?? null
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

  // "today" / "tomorrow" / "Thursday" for the list header + empty state.
  // English "today/tomorrow" read better lowercased mid-sentence; German nouns
  // stay capitalised.
  const viewDayLabel = useMemo(() => {
    const rel = (key: "today" | "tomorrow") =>
      lang === "en" ? t(key).toLowerCase() : t(key);
    if (!selectedDate) return rel("today");
    const a = new Date();
    a.setHours(0, 0, 0, 0);
    const b = new Date(selectedDate);
    b.setHours(0, 0, 0, 0);
    const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000);
    if (diff === 0) return rel("today");
    if (diff === 1) return rel("tomorrow");
    return weekdayName(b, lang, "long");
  }, [selectedDate, lang, t]);

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

        {/* Value headline — reframes the page around planning, not just "now" */}
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-line bg-paper px-4 py-1.5">
          <span className="text-base leading-none">🚚</span>
          <p className="truncate text-[12.5px] font-semibold text-ink-soft sm:text-[13.5px]">
            {t("headline")}
          </p>
        </div>

        {/* Day selector — one control drives the map + list + events together */}
        <DaySelector value={selectedDate} onChange={setSelectedDate} />

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
            {isToday && (
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
            )}

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
                {t("trucksOut", {
                  n: sorted.length,
                  s: sorted.length === 1 ? "" : "s",
                  day: viewDayLabel,
                })}
                {citySlug && ` · ${CITIES[citySlug]?.name}`}
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

            {!isToday && (
              <p className="px-4 pb-1 text-[12px] text-muted">{t("liveOnlyToday")}</p>
            )}

            {viewEvents.length > 0 && (
              <EventStrip
                events={viewEvents}
                title={isToday ? t("eventsUpcoming") : t("eventsOnDay", { day: viewDayLabel })}
                lang={lang}
              />
            )}

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
                  {isToday || query || cuisines.size > 0 || citySlug
                    ? t("noMatch")
                    : t("noTrucksDay", { day: viewDayLabel })}
                </p>
              ) : (
                sorted.map(({ entry, dist }) => {
                  const k = keyOf(entry);
                  return (
                    <TruckCard
                      key={k}
                      entry={entry}
                      signedIn={signedIn}
                      favorited={favoritedSet.has(entry.truck.id)}
                      selected={selectedId === k}
                      distanceKm={userLocation ? dist : null}
                      isOwnerView={ownedTruckIds.has(entry.truck.id)}
                      onSelect={() => setSelectedId(k)}
                      onHover={(h) => setHoveredId(h ? k : null)}
                      ref={(el) => {
                        if (el) cardRefs.current.set(k, el);
                        else cardRefs.current.delete(k);
                      }}
                    />
                  );
                })
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
              eventPins={eventPins}
              userLocation={userLocation}
              cityCenter={cityCenter}
              hoveredId={hoveredId}
              selectedId={selectedId}
              boostedCount={boostedCount}
              onHover={setHoveredId}
              onSelect={setSelectedId}
              onSelectEvent={(id) => router.push(`/events/${id}`)}
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

      {/* ---------- Below the fold: full browsable directory (always live) ---------- */}
      <BrowseAll
        entries={liveEntries}
        signedIn={signedIn}
        favoritedSet={favoritedSet}
        ownTruckIds={ownedTruckIds}
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
          isOwnerView={ownedTruckIds.has(selectedEntry.truck.id)}
          reviewsRequireLogin={reviewsRequireLogin}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

/** Compact horizontal strip of events, shown at the top of the discovery list. */
function EventStrip({
  events,
  title,
  lang,
}: {
  events: EventWithTrucks[];
  title: string;
  lang: Lang;
}) {
  return (
    <div className="border-b border-line px-4 pb-3 pt-2">
      <p className="mb-2 font-display text-[12px] font-bold uppercase tracking-wider text-muted">
        {title}
      </p>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {events.map((e) => {
          const meta = EVENT_TYPE_META[normalizeEventType(e.event_type)];
          const time = formatEventTime(e.start_time, e.end_time);
          const dateLabel =
            e.start_date === e.end_date
              ? weekdayName(new Date(`${e.start_date}T00:00:00`), lang, "short")
              : formatEventDateRange(e.start_date, e.end_date);
          return (
            <Link
              key={e.id}
              href={`/events/${e.id}`}
              className="flex w-[220px] flex-shrink-0 gap-2.5 rounded-xl border border-line bg-card p-2.5 shadow-paper transition hover:border-brand-200 hover:shadow-card-hover"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-50 text-lg">
                {e.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>{meta.emoji}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold leading-tight text-ink">{e.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                  <CalendarDays className="h-3 w-3" />
                  {dateLabel}
                  {time && ` · ${time}`}
                </p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{e.location_name}</span>
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
