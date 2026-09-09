"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { PublicTruck } from "@/lib/types";
import CateringCard from "./CateringCard";

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Light client-side filter over an already-fetched list — no server round trip. */
export default function CateringGrid({ trucks }: { trucks: PublicTruck[] }) {
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const cuisines = useMemo(() => {
    const set = new Set<string>();
    for (const t of trucks) for (const c of t.cuisine_type) set.add(c);
    return Array.from(set).sort();
  }, [trucks]);

  const filtered = trucks.filter((t) => {
    if (cuisine && !t.cuisine_type.includes(cuisine)) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const haystack = `${t.name} ${t.catering_area ?? ""} ${t.description ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {cuisines.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCuisine(null)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                cuisine === null
                  ? "border-brand bg-brand text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-brand/40"
              )}
            >
              All cuisines
            </button>
            {cuisines.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCuisine(c === cuisine ? null : c)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  c === cuisine
                    ? "border-brand bg-brand text-white"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-brand/40"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by area, e.g. Zürich"
            className="w-full rounded-full border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-neutral-200 py-16 text-center">
          <p className="text-4xl">🍽️</p>
          <p className="mt-3 text-sm text-neutral-500">No trucks match your filters.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <CateringCard key={t.id} truck={t} />
          ))}
        </div>
      )}
    </div>
  );
}
