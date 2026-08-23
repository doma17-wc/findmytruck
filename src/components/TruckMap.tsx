"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { TruckStop } from "@/lib/data";
import { formatTimeRange } from "@/lib/geo";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const ZURICH_CENTER: [number, number] = [8.5417, 47.3769];

interface TruckMapProps {
  stops: TruckStop[];
  userLocation: [number, number] | null;
  selectedTruckId: string | null;
  onSelectTruck: (truckId: string | null) => void;
}

export default function TruckMap({
  stops,
  userLocation,
  selectedTruckId,
  onSelectTruck,
}: TruckMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const popupsRef = useRef<Map<string, mapboxgl.Popup>>(new Map());
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: ZURICH_CENTER,
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

  // Truck markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existingIds = new Set(markersRef.current.keys());
    const nextIds = new Set(stops.map((s) => s.truck.id));

    // Remove stale markers
    for (const id of existingIds) {
      if (!nextIds.has(id)) {
        markersRef.current.get(id)?.remove();
        markersRef.current.delete(id);
        popupsRef.current.delete(id);
      }
    }

    stops.forEach(({ truck, schedule }) => {
      const lngLat: [number, number] = [schedule.location_lng, schedule.location_lat];

      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; min-width: 220px;">
          <div style="padding: 12px 14px 10px;">
            <div style="font-weight: 700; font-size: 15px; color: #111;">${escapeHtml(
              truck.name
            )}</div>
            <div style="font-size: 13px; color: #666; margin-top: 2px;">${escapeHtml(
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
          width: 40px; height: 40px; border-radius: 50%;
          background: #FF6A00; border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; cursor: pointer; padding: 0;
        `;
        el.textContent = "🚚";

        const popup = new mapboxgl.Popup({ offset: 24, closeButton: true }).setHTML(popupHtml);
        popupsRef.current.set(truck.id, popup);

        marker = new mapboxgl.Marker({ element: el })
          .setLngLat(lngLat)
          .setPopup(popup)
          .addTo(map);

        el.addEventListener("click", () => onSelectTruck(truck.id));

        markersRef.current.set(truck.id, marker);
      } else {
        marker.setLngLat(lngLat);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops]);

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
