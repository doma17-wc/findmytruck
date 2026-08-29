import { Star } from "lucide-react";
import type { TruckStatus } from "@/lib/geo";
import type { TruckRating } from "./types";

/** Small star + score, used on cards and in the detail sheet. */
export function RatingBadge({
  rating,
  size = "sm",
}: {
  rating: TruckRating | null;
  size?: "sm" | "lg";
}) {
  if (!rating || rating.count === 0) return null;
  const lg = size === "lg";
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-bold text-ink ${
        lg ? "text-base" : "text-xs"
      }`}
    >
      <Star
        className={lg ? "h-4 w-4" : "h-3.5 w-3.5"}
        fill="#F59E0B"
        color="#F59E0B"
      />
      {rating.avg.toFixed(1)}
      <span className="font-sans font-medium text-muted">({rating.count})</span>
    </span>
  );
}

interface StatusPillProps {
  status: TruckStatus;
  live?: boolean;
  unclaimed?: boolean;
  className?: string;
}

/** OPEN NOW (green, pulsing beacon) / Closed (grey) / Opens at 11:30. */
export function StatusPill({ status, live, unclaimed, className = "" }: StatusPillProps) {
  if (unclaimed) {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-neutral-600 shadow-sm ${className}`}
      >
        Unclaimed
      </span>
    );
  }

  const open = status.state === "open";
  const soon = status.state === "opens_today";

  const tone = open
    ? "bg-green-500 text-white"
    : soon
    ? "bg-brand text-white"
    : "bg-neutral-200 text-neutral-600";

  const label = open ? (live ? "LIVE NOW" : "OPEN NOW") : status.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide shadow-sm ${tone} ${className}`}
    >
      {open && (
        <span className="relative flex h-1.5 w-1.5 text-white/90">
          <span className="live-beacon absolute inset-0" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {label}
    </span>
  );
}
