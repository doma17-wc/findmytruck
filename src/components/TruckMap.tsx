"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { formatTimeRange } from "@/lib/geo";
import { DEFAULT_MAP_CENTER } from "@/lib/cities";
import type { TruckStatusEntry } from "./HomeClient";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const PIN_COLORS = {
  open: "#22c55e",
  opens_today: "#f97316",
  next_day: "#A3A3A3",
  none: "#A3A3A3",
} as const;

const BADGE_COLORS = {
  open: "#22c55e",
  opens_today: "#f97316",
  next_day: "#737373",
  none: "#737373",
} as const;

interface TruckMapProps {
  trucks: TruckStatusEntry[];
  userLocation: [number, number] | null;
  selectedTruckId: string | null;
  onSelectTruck: (truckId: string | null) => void;
}

export default function TruckMap({
  trucks,
  userLocation,
  selectedTruckId,
  onSelectTruck,
}: TruckMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const popupsRef = useRef<Map<string, mapboxgl.Popup>>(new Map());
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const didAutoFitRef = useRef(false);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: DEFAULT_MAP_CENTER,
      zoom: 13,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // User location marker + recenter
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(userLocation);
    } else {
      const el = document.createElement("div");
      el.className = "user-location-dot";
      el.style.width = "16px";
      el.style.height = "16px";
      el.style.borderRadius = "50%";
      el.style.background = "#2563eb";
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.4)";
      userMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat(userLocation)
        .addTo(map);
    }

    map.flyTo({ center: userLocation, zoom: 14 });
  }, [userLocation]);

  // With no user location, frame the map around every truck once they load.
  // A single cluster (e.g. all in Zurich) stays zoomed in; trucks spread across
  // Switzerland zoom the map out far enough to show them all.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || userLocation || didAutoFitRef.current) return;

    const points = trucks
      .filter((t) => t.status.schedule)
      .map(
        (t) =>
          [t.status.schedule!.location_lng, t.status.schedule!.location_lat] as [number, number]
      );
    if (points.length === 0) return;

    didAutoFitRef.current = true;

    if (points.length === 1) {
      map.flyTo({ center: points[0], zoom: 13 });
      return;
    }

    const bounds = points.reduce(
      (b, p) => b.extend(p),
      new mapboxgl.LngLatBounds(points[0], points[0])
    );
    map.fitBounds(bounds, { padding: 72, maxZoom: 14, duration: 600 });
  }, [trucks, userLocation]);

  // Truck markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existingIds = new Set(markersRef.current.keys());
    const nextIds = new Set(trucks.map((t) => t.truck.id));

    // Remove stale markers
    for (const id of existingIds) {
      if (!nextIds.has(id)) {
        markersRef.current.get(id)?.remove();
        markersRef.current.delete(id);
        popupsRef.current.delete(id);
      }
    }

    trucks.forEach(({ truck, status }) => {
      const schedule = status.schedule!;
      const lngLat: [number, number] = [schedule.location_lng, schedule.location_lat];
      const pinColor = PIN_COLORS[status.state];
      const badgeColor = BADGE_COLORS[status.state];

      const popupHtml = `
        <div style="font-family: 'Inter', system-ui, sans-serif; min-width: 220px;">
          <div style="padding: 12px 14px 10px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-weight: 700; font-size: 15px; color: #111;">${escapeHtml(
                truck.name
              )}</span>
              <span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; color: white; background: ${badgeColor};">${escapeHtml(
                status.label
              )}</span>
            </div>
            <div style="font-size: 13px; color: #666; margin-top: 3px;">${escapeHtml(
              truck.cuisine_type.join(", ")
            )}</div>
            <div style="font-size: 13px; color: #333; margin-top: 8px; display:flex; align-items:center; gap:4px;">
              📍 ${escapeHtml(schedule.location_name)}
            </div>
            <div style="font-size: 13px; color: #333; margin-top: 2px;">
              🕒 ${escapeHtml(formatTimeRange(schedule.start_time, schedule.end_time))}
            </div>
            <a href="/trucks/${encodeURIComponent(truck.slug)}"
               style="display:block; margin-top:10px; background:#FF6A00; color:white; text-align:center; padding:8px 10px; border-radius:8px; font-weight:600; font-size:13px; text-decoration:none;">
              View profile
            </a>
          </div>
        </div>
      `;

      let marker = markersRef.current.get(truck.id);
      if (!marker) {
        const el = document.createElement("button");
        el.setAttribute("aria-label", `${truck.name} location`);
        el.style.cssText = `
          width: 40px; height: 40px; border-radius: 50% 50% 50% 4px;
          transform: rotate(45deg);
          background: ${pinColor};
          border: 3px solid white;
          box-shadow: 0 3px 8px rgba(0,0,0,0.35);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; padding: 0;
        `;
        const inner = document.createElement("span");
        inner.textContent = "🚚";
        inner.style.cssText = "display:block; transform: rotate(-45deg); font-size: 17px;";
        el.appendChild(inner);
        if (status.state === "open") el.classList.add("pulse-ring");

        const popup = new mapboxgl.Popup({ offset: 28, closeButton: true }).setHTML(popupHtml);
        popupsRef.current.set(truck.id, popup);

        marker = new mapboxgl.Marker({ element: el })
          .setLngLat(lngLat)
          .setPopup(popup)
          .addTo(map);

        el.addEventListener("click", () => onSelectTruck(truck.id));

        markersRef.current.set(truck.id, marker);
      } else {
        marker.setLngLat(lngLat);
        marker.getPopup()?.setHTML(popupHtml);
        const el = marker.getElement();
        el.style.background = pinColor;
        el.classList.toggle("pulse-ring", status.state === "open");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trucks]);

  // React to external selection (e.g. clicking a list item)
  useEffect(() => {
    if (!selectedTruckId) return;
    const marker = markersRef.current.get(selectedTruckId);
    const map = mapRef.current;
    if (!marker || !map) return;
    map.flyTo({ center: marker.getLngLat(), zoom: 15 });
    const popup = marker.getPopup();
    if (popup && !popup.isOpen()) {
      marker.togglePopup();
    }
  }, [selectedTruckId]);

  return <div ref={mapContainerRef} className="h-full w-full" />;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
