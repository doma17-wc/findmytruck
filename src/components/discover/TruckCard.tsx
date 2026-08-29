"use client";

import { forwardRef } from "react";
import Image from "next/image";
import { Radio } from "lucide-react";
import { formatDistance } from "@/lib/geo";
import { isUnclaimed } from "@/lib/unclaimed";
import FavoriteButton from "@/components/FavoriteButton";
import TruckPlaceholder from "@/components/site/TruckPlaceholder";
import type { DiscoverEntry } from "./types";
import { RatingBadge, StatusPill } from "./Bits";
import { timeAgo } from "./helpers";

interface TruckCardProps {
  entry: DiscoverEntry;
  now: Date;
  signedIn: boolean;
  favorited: boolean;
  selected: boolean;
  distanceKm: number | null;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
}

const TruckCard = forwardRef<HTMLDivElement, TruckCardProps>(function TruckCard(
  { entry, now, signedIn, favorited, selected, distanceKm, onSelect, onHover },
  ref
) {
  const { truck, status, rating, live, liveSince } = entry;
  const image = truck.cover_photo_url ?? truck.logo_url;
  const unclaimed = isUnclaimed(truck);
  const cityLine = status.schedule?.location_name ?? truck.source_region ?? "Location to be confirmed";

  return (
    <div
      ref={ref}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`group relative scroll-mt-4 overflow-hidden rounded-2xl border bg-card text-left transition duration-200 ${
        selected
          ? "border-brand ring-2 ring-brand/30 shadow-card-hover"
          : "border-line shadow-paper hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-stretch gap-0 text-left"
      >
        <div className="relative h-[124px] w-[112px] flex-shrink-0 bg-paper-deep sm:w-[124px]">
          {image ? (
            <Image
              src={image}
              alt={truck.name}
              fill
              className="object-cover transition duration-300 group-hover:scale-105"
              sizes="124px"
            />
          ) : (
            <TruckPlaceholder name={truck.name} compact />
          )}
        </div>

        <div className="min-w-0 flex-1 p-3.5 pr-10">
          <div className="flex items-center gap-2">
            <StatusPill status={status} live={live} unclaimed={unclaimed} />
          </div>

          <h3 className="mt-1.5 truncate font-display text-[17px] font-bold leading-tight text-ink">
            {truck.name}
          </h3>

          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p className="truncate text-[13px] text-muted">
              {truck.cuisine_type.slice(0, 3).join(" · ") || "Food truck"}
            </p>
            <RatingBadge rating={rating} />
          </div>

          <p className="mt-1 truncate text-[13px] text-ink-soft">
            <span className="text-muted">📍</span> {cityLine}
          </p>

          {live && liveSince ? (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-live">
              <Radio className="h-3.5 w-3.5" />
              Confirmed live {timeAgo(liveSince, now)}
            </p>
          ) : (
            !unclaimed &&
            status.state !== "open" && (
              <p className="mt-1.5 text-[12px] font-medium text-muted">{status.label}</p>
            )
          )}

          {distanceKm !== null && (
            <p className="mt-1 font-mono text-[12px] text-muted">
              {formatDistance(distanceKm)} away
            </p>
          )}
        </div>
      </button>

      <div className="absolute right-2 top-2">
        <FavoriteButton
          truckId={truck.id}
          initialFavorited={favorited}
          signedIn={signedIn}
          size="sm"
        />
      </div>
    </div>
  );
});

export default TruckCard;
