import type { ReactNode } from "react";
import { Star } from "lucide-react";
import type { TruckTier } from "@/lib/geo";

/**
 * Shared presentational bits for the customer truck profile — used by both the
 * slide-over `DetailSheet` and the full `/trucks/[slug]` page so the two stay
 * visually identical.
 */

export function SectionHeading({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="font-display text-[13px] font-bold uppercase tracking-[0.14em] text-muted">
        {children}
      </h2>
      {action}
    </div>
  );
}

/** Three-tier status pill with the boosted "live" beacon. i18n-free. */
export function ProfileStatusPill({
  tier,
  label,
  className = "",
}: {
  tier: TruckTier;
  label: string;
  className?: string;
}) {
  const tone =
    tier === "boosted"
      ? "bg-live text-white shadow-sm shadow-live/30"
      : tier === "open"
      ? "bg-green-100 text-green-700 ring-1 ring-inset ring-green-500/25"
      : "bg-neutral-200 text-neutral-600";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${tone} ${className}`}
    >
      {tier === "boosted" && (
        <span className="relative flex h-1.5 w-1.5 text-white">
          <span className="live-beacon absolute inset-0" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {label}
    </span>
  );
}

/** Star + numeric score. Links to the reviews section when `href` is given. */
export function RatingLine({
  avg,
  count,
  href = "#reviews",
  className = "",
}: {
  avg: number;
  count: number;
  href?: string;
  className?: string;
}) {
  if (count === 0) {
    return <span className={`text-[13px] font-medium text-muted ${className}`}>No reviews yet</span>;
  }
  return (
    <a
      href={href}
      className={`inline-flex items-center gap-1.5 text-[13px] transition hover:opacity-80 ${className}`}
    >
      <span className="inline-flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`h-3.5 w-3.5 ${n <= Math.round(avg) ? "fill-amber text-amber" : "text-line"}`}
          />
        ))}
      </span>
      <span className="font-mono font-bold text-ink">{avg.toFixed(1)}</span>
      <span className="text-muted">
        ({count} review{count === 1 ? "" : "s"})
      </span>
    </a>
  );
}
