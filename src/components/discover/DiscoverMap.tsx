"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Crosshair, Locate } from "lucide-react";
import { isUnclaimed } from "@/lib/unclaimed";
import { DEFAULT_MAP_CENTER } from "@/lib/cities";
import type { DiscoverEntry } from "./types";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const STATE_FILL: Record<string, string> = {
  open: "#22c55e",
  opens_today: "#FF6A00",
  next_day: "#A3A3A3",
  none: "#A3A3A3",
};

interface PinMeta {
  fill: string;
  border: string;
  live: boolean;
  unclaimed: boolean;
  iconOpacity: string;
}

interface DiscoverMapProps {
  entries: DiscoverEntry[];
  userLocation: [number, number] | null;
  cityCenter: [number, number] | null;
  hoveredId: string | null;
  selectedId: string | null;
  liveCount: number;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

export default function DiscoverMap({
  entries,
  userLocation,
  cityCenter,
  hoveredId,
  selectedId,
  liveCount,
  onHover,
  onSelect,
}: DiscoverMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const metaRef = useRef<Map<string, PinMeta>>(new Map());
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const didAutoFitRef = useRef(false);

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

    // Keep the canvas sized to its container (mobile map/list toggle, split resize)
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      metaRef.current.clear();
    };
  }, []);

  // User location dot
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(userLocation);
    } else {
      const el = document.createElement("div");
      el.style.cssText =
        "width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid white;box-shadow:0 0 0 2px rgba(37,99,235,0.35);";
      userMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat(userLocation)
        .addTo(map);
    }
    map.flyTo({ center: userLocation, zoom: 13.5 });
  }, [userLocation]);

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
        metaRef.current.delete(id);
      }
    }

    entries.forEach((entry) => {
      const { truck, status, coord, live } = entry;
      const unclaimed = isUnclaimed(truck);
      const meta: PinMeta = {
        fill: unclaimed ? "#FFFFFF" : STATE_FILL[status.state] ?? "#A3A3A3",
        border: live ? "#16A34A" : unclaimed ? "#A3A3A3" : "#FFFFFF",
        live,
        unclaimed,
        iconOpacity: unclaimed ? "0.55" : "1",
      };
      metaRef.current.set(truck.id, meta);

      let marker = markersRef.current.get(truck.id);
      if (!marker) {
        const el = document.createElement("button");
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

        marker = new mapboxgl.Marker({ element: el }).setLngLat(coord).addTo(map);
        markersRef.current.set(truck.id, marker);
      } else {
        marker.setLngLat(coord);
      }
      applyPinStyle(truck.id);
    });

    // Frame all trucks on first load (only when the user has no location)
    if (!didAutoFitRef.current && !userLocation && !cityCenter && entries.length > 0) {
      didAutoFitRef.current = true;
      const pts = entries.map((e) => e.coord);
      if (pts.length === 1) {
        map.flyTo({ center: pts[0], zoom: 13 });
      } else {
        const bounds = pts.reduce(
          (b, p) => b.extend(p),
          new mapboxgl.LngLatBounds(pts[0], pts[0])
        );
        map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 600 });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

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
    const meta = metaRef.current.get(id);
    if (!marker || !meta) return;
    const el = marker.getElement();
    const selected = selectedRef.current === id;
    const hovered = hoveredRef.current === id;

    el.className = `fmt-pin${meta.live ? " is-live" : ""}${
      hovered ? " is-hovered" : ""
    }${selected ? " is-selected" : ""}`;
    el.style.background = selected ? "#FF6A00" : meta.fill;
    el.style.border = `3px solid ${selected ? "#FF6A00" : meta.border}`;
    const inner = el.firstElementChild as HTMLElement | null;
    if (inner) inner.style.opacity = meta.iconOpacity;
    el.style.zIndex = selected ? "6" : hovered ? "4" : "1";
  }

  function recenter() {
    const map = mapRef.current;
    if (!map) return;
    if (userLocation) {
      map.flyTo({ center: userLocation, zoom: 13.5, duration: 600 });
      return;
    }
    const pts = entries.map((e) => e.coord);
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.flyTo({ center: pts[0], zoom: 13, duration: 600 });
      return;
    }
    const bounds = pts.reduce(
      (b, p) => b.extend(p),
      new mapboxgl.LngLatBounds(pts[0], pts[0])
    );
    map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 600 });
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {liveCount > 0 && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full bg-ink/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-sm">
          <span className="relative flex h-2 w-2 text-green-400">
            <span className="live-beacon absolute inset-0" />
            <span className="relative h-2 w-2 rounded-full bg-current" />
          </span>
          {liveCount} truck{liveCount === 1 ? "" : "s"} live now
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
