"use client";

import Image from "next/image";
import Link from "next/link";
import type { PublicTruck } from "@/lib/types";
import { formatDistance, formatTimeRange, type TruckStatus } from "@/lib/geo";
import FavoriteButton from "@/components/FavoriteButton";

interface TruckListItemProps {
  truck: PublicTruck;
  status: TruckStatus;
  distanceKm: number | null;
  signedIn: boolean;
  isFavorited: boolean;
  onSelect: () => void;
}

const BADGE_CLASSES: Record<TruckStatus["state"], string> = {
  open: "bg-green-500 text-white",
  opens_today: "bg-orange-500 text-white",
  next_day: "bg-neutral-500 text-white",
  none: "bg-neutral-900/80 text-white",
};

export default function TruckListItem({
  truck,
  status,
  distanceKm,
  signedIn,
  isFavorited,
  onSelect,
}: TruckListItemProps) {
  const schedule = status.schedule!;
  const image = truck.cover_photo_url ?? truck.logo_url;

  return (
    <button
      onClick={onSelect}
      className="group relative w-full overflow-hidden rounded-2xl border border-neutral-100 bg-white text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0"
    >
      <div className="relative h-32 w-full bg-neutral-100">
        {image ? (
          <Image
            src={image}
            alt={truck.name}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 320px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">🚚</div>
        )}

        <div className="absolute left-3 top-3">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold shadow-sm ${BADGE_CLASSES[status.state]}`}
          >
            {status.label}
          </span>
        </div>

        <div className="absolute right-3 top-3">
          <FavoriteButton
            truckId={truck.id}
            initialFavorited={isFavorited}
            signedIn={signedIn}
            size="sm"
          />
        </div>

        {distanceKm !== null && (
          <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-neutral-800 shadow-sm">
            {formatDistance(distanceKm)}
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="truncate text-base font-bold text-neutral-900">{truck.name}</h3>

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

        <p className="mt-2.5 truncate text-sm text-neutral-500">
          📍 {schedule.location_name} · {formatTimeRange(schedule.start_time, schedule.end_time)}
        </p>

        <Link
          href={`/trucks/${truck.slug}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-neutral-900 py-2.5 text-sm font-bold text-white transition group-hover:bg-brand"
        >
          View profile
        </Link>
      </div>
    </button>
  );
}
