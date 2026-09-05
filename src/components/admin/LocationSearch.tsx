"use client";

import { useEffect, useRef, useState } from "react";
import { GEOCODE_COUNTRY } from "@/lib/cities";

interface GeocodeFeature {
  place_name: string;
  center: [number, number]; // [lng, lat]
}

interface LocationSearchProps {
  onSelect: (result: { name: string; lat: number; lng: number }) => void;
}

export default function LocationSearch({ onSelect }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeFeature[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json?access_token=${token}&country=${GEOCODE_COUNTRY}&limit=5`;
      try {
        const res = await fetch(url);
        const json = await res.json();
        setResults(json.features ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search an address in Switzerland…"
        className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-[15px] focus:border-accent focus:outline-none"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-xl border border-neutral-200 bg-white shadow-lg">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  // Full address (street + number + postal code + city), country
                  // suffix trimmed since search is already restricted to Switzerland.
                  const name = r.place_name
                    .replace(/,\s*Switzerland$/i, "")
                    .replace(/,\s*Schweiz$/i, "")
                    .replace(/,\s*Suisse$/i, "")
                    .trim();
                  onSelect({ name, lat: r.center[1], lng: r.center[0] });
                  setQuery(r.place_name);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
              >
                {r.place_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
