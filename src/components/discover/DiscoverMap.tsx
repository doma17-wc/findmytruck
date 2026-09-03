"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Crosshair, Locate } from "lucide-react";
import { isUnclaimed } from "@/lib/unclaimed";
import { DEFAULT_MAP_CENTER } from "@/lib/cities";
import type { DiscoverEntry } from "./types";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

/**
 * Bounding box around the bulk of the pins, ignoring far outliers so the initial
 * camera frames the main cluster instead of zooming out to the whole country.
 * Keeps every pin within `maxKm` of the median point; falls back to all points
 * if that would leave too few.
 */
function coreBounds(pts: [number, number][], maxKm = 40): mapboxgl.LngLatBounds {
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  const cLng = median(pts.map((p) => p[0]));
  const cLat = median(pts.map((p) => p[1]));
  const km = ([lng, lat]: [number, number]) =>
    Math.hypot((lat - cLat) * 111, (lng - cLng) * 111 * Math.cos((cLat * Math.PI) / 180));
  const core = pts.filter((p) => km(p) <= maxKm);
  const use = core.length >= Math.max(2, Math.ceil(pts.length * 0.5)) ? core : pts;
  return use.reduce(
    (b, p) => b.extend(p),
    new mapboxgl.LngLatBounds(use[0], use[0])
  );
}

const TIER_FILL: Record<string, string> = {
  boosted: "#16a34a", // bright green
  open: "#86efac", // soft green
  closed: "#A3A3A3", // grey
};

interface PinMeta {
  fill: string;
  border: string;
  boosted: boolean;
  unclaimed: boolean;
  iconOpacity: string;
}

interface DiscoverMapProps {
  entries: DiscoverEntry[];
  userLocation: [number, number] | null;
  cityCenter: [number, number] | null;
  hoveredId: string | null;
  selectedId: string | null;
  boostedCount: number;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onRequestLocation?: () => void;
}

export default function DiscoverMap({
  entries,
  userLocation,
  cityCenter,
  hoveredId,
  selectedId,
  boostedCount,
  onHover,
  onSelect,
  onRequestLocation,
}: DiscoverMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  // The styled inner button for each pin. NB: this is a CHILD of the element
  // Mapbox owns — never touch the marker's own element (Mapbox writes `transform`
  // and its positioning classes onto it every frame; reassigning className there
  // strips `.mapboxgl-marker` and the pins fall out of the map's coordinate space).
  const pinElsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const metaRef = useRef<Map<string, PinMeta>>(new Map());
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const didAutoFitRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  const hoveredRef = useRef(hoveredId);
  const selectedRef = useRef(selectedId);
  hoveredRef.current = hoveredId;
  selectedRef.current = selectedId;

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: DEFAULT_MAP_CENTER,
      zoom: 12,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;
    map.on("load", () => setMapReady(true));

    // Keep the canvas sized to its container (mobile map/list toggle, split resize)
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      pinElsRef.current.clear();
      metaRef.current.clear();
      userMarkerRef.current = null;
      didAutoFitRef.current = false;
      setMapReady(false);
    };
  }, []);

  // User location dot — waits for the style to finish loading (flyTo before
  // `load` is unreliable), then drops a "you are here" marker and recenters.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(userLocation);
    } else {
      const el = document.createElement("div");
      el.className = "fmt-user-dot";
      el.setAttribute("aria-label", "Your location");
      userMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat(userLocation)
        .addTo(map);
    }
    map.flyTo({ center: userLocation, zoom: 13.5, duration: 900, essential: true });
  }, [userLocation, mapReady]);

  // Recenter when the city selector changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !cityCenter) return;
    map.flyTo({ center: cityCenter, zoom: 12.5, duration: 700 });
  }, [cityCenter]);

  // Build / update / prune markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const nextIds = new Set(entries.map((e) => e.truck.id));
    for (const [id, marker] of markersRef.current) {
      if (!nextIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
        pinElsRef.current.delete(id);
        metaRef.current.delete(id);
      }
    }

    entries.forEach((entry) => {
      const { truck, status, coord } = entry;
      const unclaimed = isUnclaimed(truck);
      const boosted = status.tier === "boosted";
      const meta: PinMeta = {
        fill: unclaimed ? "#FFFFFF" : TIER_FILL[status.tier] ?? "#A3A3A3",
        border: boosted ? "#15803d" : unclaimed ? "#A3A3A3" : "#FFFFFF",
        boosted,
        unclaimed,
        iconOpacity: unclaimed ? "0.55" : "1",
      };
      metaRef.current.set(truck.id, meta);

      let marker = markersRef.current.get(truck.id);
      if (!marker) {
        // Mapbox owns `wrapper`: it sets positioning classes + a per-frame
        // `transform` on it. All of our styling goes on the inner button.
        const wrapper = document.createElement("div");
        const el = document.createElement("button");
        el.type = "button";
        el.className = "fmt-pin";
        el.setAttribute("aria-label", `${truck.name} on map`);
        const inner = document.createElement("span");
        inner.textContent = "🚚";
        el.appendChild(inner);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelect(truck.id);
        });
        el.addEventListener("mouseenter", () => onHover(truck.id));
        el.addEventListener("mouseleave", () => onHover(null));
        wrapper.appendChild(el);

        marker = new mapboxgl.Marker({ element: wrapper }).setLngLat(coord).addTo(map);
        markersRef.current.set(truck.id, marker);
        pinElsRef.current.set(truck.id, el);
      } else {
        marker.setLngLat(coord);
      }
      applyPinStyle(truck.id);
    });

    // Frame trucks on first load (only when the user has no location). Fit to the
    // core cluster, not every far-flung pin — a couple of trucks near Interlaken
    // or Basel would otherwise zoom the map so far out that the ~55 greater-Zürich
    // pins collapse into an unreadable stack.
    if (!didAutoFitRef.current && !userLocation && !cityCenter && entries.length > 0) {
      didAutoFitRef.current = true;
      const pts = entries.map((e) => e.coord);
      if (pts.length === 1) {
        map.flyTo({ center: pts[0], zoom: 13 });
      } else {
        map.fitBounds(coreBounds(pts), { padding: 64, maxZoom: 14, duration: 600 });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, mapReady]);

  // Re-style pins on hover / selection change
  useEffect(() => {
    for (const id of markersRef.current.keys()) applyPinStyle(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredId, selectedId]);

  // Fly to the selected truck
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const marker = markersRef.current.get(selectedId);
    if (!marker) return;
    map.flyTo({ center: marker.getLngLat(), zoom: Math.max(map.getZoom(), 14), duration: 600 });
  }, [selectedId]);

  function applyPinStyle(id: string) {
    const marker = markersRef.current.get(id);
    const el = pinElsRef.current.get(id);
    const meta = metaRef.current.get(id);
    if (!marker || !el || !meta) return;
    const selected = selectedRef.current === id;
    const hovered = hoveredRef.current === id;

    el.className = `fmt-pin${meta.boosted ? " is-boosted" : ""}${
      hovered ? " is-hovered" : ""
    }${selected ? " is-selected" : ""}`;
    el.style.background = selected ? "#FF6A00" : meta.fill;
    el.style.border = `3px solid ${selected ? "#FF6A00" : meta.border}`;
    const inner = el.firstElementChild as HTMLElement | null;
    if (inner) inner.style.opacity = meta.iconOpacity;
    // z-index belongs on the Mapbox-owned wrapper so pins stack against each
    // other; the wrapper's other styles (position, transform) are left alone.
    marker.getElement().style.zIndex = selected ? "6" : hovered ? "4" : "1";
  }

  function recenter() {
    const map = mapRef.current;
    if (!map) return;
    if (userLocation) {
      map.flyTo({ center: userLocation, zoom: 13.5, duration: 600 });
      return;
    }
    // No fix yet — (re)ask the browser for it; fall back to framing all pins.
    onRequestLocation?.();
    const pts = entries.map((e) => e.coord);
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.flyTo({ center: pts[0], zoom: 13, duration: 600 });
      return;
    }
    map.fitBounds(coreBounds(pts), { padding: 64, maxZoom: 14, duration: 600 });
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {boostedCount > 0 && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full bg-ink/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-sm">
          <span className="relative flex h-2 w-2 text-green-400">
            <span className="live-beacon absolute inset-0" />
            <span className="relative h-2 w-2 rounded-full bg-current" />
          </span>
          {boostedCount} truck{boostedCount === 1 ? "" : "s"} boosted now
        </div>
      )}

      <button
        type="button"
        onClick={recenter}
        aria-label="Recenter map"
        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink-soft shadow-lg transition hover:text-brand active:scale-95"
      >
        {userLocation ? <Locate className="h-5 w-5" /> : <Crosshair className="h-5 w-5" />}
      </button>
    </div>
  );
}
