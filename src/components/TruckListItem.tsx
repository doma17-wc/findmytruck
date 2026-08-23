"use client";

import Image from "next/image";
import Link from "next/link";
import type { TruckStop } from "@/lib/data";
import { formatDistance, formatTimeRange } from "@/lib/geo";

interface TruckListItemProps {
  stop: TruckStop;
  distanceKm: number | null;
  onSelect: () => void;
}

export default function TruckListItem({ stop, distanceKm, onSelect }: TruckListItemProps) {
  const { truck, schedule } = stop;

  return (
    <button
      onClick={onSelect}
      className="flex w-full items-center gap-3 border-b border-neutral-100 p-4 text-left last:border-b-0 active:bg-neutral-50"
    >
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-100">
        {truck.logo_url ? (
          <Image src={truck.logo_url} alt={truck.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">🚚</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-base font-semibold text-neutral-900">{truck.name}</h3>
          {distanceKm !== null && (
            <span className="flex-shrink-0 text-sm font-medium text-brand">
              {formatDistance(distanceKm)}
            </span>
          )}
        </div>
        <p className="truncate text-sm text-neutral-500">{truck.cuisine_type.join(", ")}</p>
        <p className="mt-1 truncate text-sm text-neutral-700">
          📍 {schedule.location_name} · {formatTimeRange(schedule.start_time, schedule.end_time)}
        </p>
      </div>

      <Link
        href={`/trucks/${truck.slug}`}
        onClick={(e) => e.stopPropagation()}
        className="flex-shrink-0 rounded-full bg-brand-50 px-3 py-2 text-sm font-semibold text-brand active:bg-brand-100"
      >
        View
      </Link>
    </button>
  );
}
