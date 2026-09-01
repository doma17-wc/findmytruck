"use client";

import Image from "next/image";
import { Radio } from "lucide-react";
import { formatDistance } from "@/lib/geo";
import { isUnclaimed } from "@/lib/unclaimed";
import FavoriteButton from "@/components/FavoriteButton";
import TruckPlaceholder from "@/components/site/TruckPlaceholder";
import type { DiscoverEntry } from "./types";
import { RatingBadge, StatusPill } from "./Bits";
import { timeAgo } from "./helpers";

interface BrowseCardProps {
  entry: DiscoverEntry;
  now: Date;
  signedIn: boolean;
  favorited: boolean;
  distanceKm: number | null;
  onSelect: () => void;
}

/** Vertical truck card for the "Browse all food trucks" grid. */
export default function BrowseCard({
  entry,
  now,
  signedIn,
  favorited,
  distanceKm,
  onSelect,
}: BrowseCardProps) {
  const { truck, status, rating, live, liveSince } = entry;
  const image = truck.cover_photo_url ?? truck.logo_url;
  const unclaimed = isUnclaimed(truck);
  const cityLine =
    status.schedule?.location_name ?? truck.source_region ?? "Location to be confirmed";

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-paper transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover"
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 flex-col text-left"
      >
        <div className="relative aspect-[16/10] w-full flex-shrink-0 bg-paper-deep">
          {image ? (
            <Image
              src={image}
              alt={truck.name}
              fill
              className="object-cover transition duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <TruckPlaceholder name={truck.name} compact />
          )}
          <div className="absolute left-2.5 top-2.5">
            <StatusPill status={status} live={live} unclaimed={unclaimed} />
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-[17px] font-bold leading-tight text-ink">
              {truck.name}
            </h3>
            <RatingBadge rating={rating} />
          </div>

          {truck.cuisine_type.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {truck.cuisine_type.slice(0, 3).map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-paper-deep px-2 py-0.5 text-[11px] font-semibold text-ink-soft"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          <p className="mt-2 truncate text-[13px] text-ink-soft">
            <span className="text-muted">📍</span> {cityLine}
          </p>

          <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
            {live && liveSince ? (
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-live">
                <Radio className="h-3.5 w-3.5" />
                Live {timeAgo(liveSince, now)}
              </span>
            ) : (
              <span className="text-[12px] font-medium text-muted">
                {status.state === "open" ? "Open now" : status.label}
              </span>
            )}
            {distanceKm !== null && (
              <span className="font-mono text-[12px] text-muted">
                {formatDistance(distanceKm)} away
              </span>
            )}
          </div>
        </div>
      </button>

      <div className="absolute right-2.5 top-2.5">
        <FavoriteButton
          truckId={truck.id}
          initialFavorited={favorited}
          signedIn={signedIn}
          size="sm"
        />
      </div>
    </div>
  );
}
