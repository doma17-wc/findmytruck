import { MapPin, Navigation } from "lucide-react";
import type { NextAppearance, TruckTier } from "@/lib/geo";
import { DAY_LABELS, DAY_LABELS_SHORT } from "@/lib/types";
import { ProfileStatusPill } from "./pieces";

interface StatusCardProps {
  tier: TruckTier;
  /** Word / short phrase in the pill: "Open" · "Boosted" · "Planned" · "Wed · 11:30–20:00". */
  headline: string;
  boosted?: boolean;
  /** Secondary line: "Serving until 20:00", "Confirmed 5 min ago". */
  sub?: string | null;
  /** Forward-looking next appearance (closed trucks). */
  next?: NextAppearance | null;
  locationName?: string | null;
  /** e.g. "exact spot to be confirmed". */
  locationNote?: string | null;
  directionsUrl?: string | null;
}

function nextLine(next: NextAppearance): string {
  const day =
    next.daysAhead === 0
      ? "Later today"
      : next.daysAhead === 1
      ? "Tomorrow"
      : next.daysAhead < 7
      ? DAY_LABELS_SHORT[next.dayOfWeek]
      : DAY_LABELS[next.dayOfWeek];
  return `Next: ${day} · ${next.locationName} · ${next.start}–${next.end}`;
}

/** The "where are they right now / next" card, shared by both profile surfaces. */
export default function StatusCard({
  tier,
  headline,
  boosted = false,
  sub,
  next,
  locationName,
  locationNote,
  directionsUrl,
}: StatusCardProps) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        boosted
          ? "border-live/40 bg-live/5"
          : tier === "open"
          ? "border-green-500/25 bg-green-50"
          : "border-line bg-card"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ProfileStatusPill tier={boosted ? "boosted" : tier} label={headline} />
        {sub && <span className="text-[13px] font-medium text-ink-soft">{sub}</span>}
      </div>

      {boosted && sub == null && (
        <p className="mt-1.5 text-[12px] font-semibold text-live">● Confirmed live right now</p>
      )}

      {tier === "closed" && next && (
        <p className="mt-2 text-[13px] font-medium text-ink-soft">{nextLine(next)}</p>
      )}

      {locationName && (
        <p className="mt-2.5 flex items-start gap-1.5 text-[13px] text-ink-soft">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" />
          <span>
            {locationName}
            {locationNote && <span className="text-muted"> · {locationNote}</span>}
          </span>
        </p>
      )}

      {directionsUrl && (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-[13px] font-bold text-white shadow-sm shadow-brand/30 transition hover:brightness-105 active:scale-[0.99]"
        >
          <Navigation className="h-4 w-4" />
          Get directions
        </a>
      )}
    </div>
  );
}
