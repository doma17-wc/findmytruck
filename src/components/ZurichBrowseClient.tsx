"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import type { PublicTruck } from "@/lib/types";

export default function ZurichBrowseClient({ trucks }: { trucks: PublicTruck[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return trucks;
    return trucks.filter(
      (t) =>
        t.name.toLowerCase().includes(q) || t.cuisine_type.some((c) => c.toLowerCase().includes(q))
    );
  }, [trucks, query]);

  return (
    <div>
      <div className="mt-6 flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-card">
        <Search className="h-4 w-4 flex-shrink-0 text-neutral-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or cuisine…"
          className="w-full text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((truck) => (
          <Link
            key={truck.id}
            href={`/trucks/${truck.slug}`}
            className="group overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <div className="relative h-40 w-full bg-neutral-100">
              {truck.cover_photo_url ? (
                <Image
                  src={truck.cover_photo_url}
                  alt={truck.name}
                  fill
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl">🚚</div>
              )}
            </div>
            <div className="p-4">
              <h2 className="text-base font-bold text-neutral-900">{truck.name}</h2>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {truck.cuisine_type.slice(0, 3).map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand"
                  >
                    {c}
                  </span>
                ))}
              </div>
              {truck.description && (
                <p className="mt-2 line-clamp-2 text-sm text-neutral-500">{truck.description}</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-8 text-center text-sm text-neutral-500">
          No trucks match &quot;{query}&quot;.
        </p>
      )}
    </div>
  );
}
