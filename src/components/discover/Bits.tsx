import { Star } from "lucide-react";
import type { NextAppearance as NextUp, TruckStatus } from "@/lib/geo";
import { useLang, weekdayName } from "@/lib/i18n";
import type { DayPlan, TruckRating } from "./types";

const MEAL_KEY: Record<NextUp["mealKey"], string> = {
  breakfast: "mealBreakfast",
  lunch: "mealLunch",
  dinner: "mealDinner",
  evening: "mealEvening",
};

function rangeLabel(start: string, end: string): string {
  if (start && end) return `${start}–${end}`;
  return start || end || "";
}

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

/**
 * Forward-looking "where they'll be next" line for a closed truck — phrased as
 * an invitation ("Tomorrow, lunch · Hardbrücke 11:30–13:30") rather than a bare
 * "Closed". Renders nothing when there's no known next appearance.
 */
export function NextUpLine({
  next,
  className = "",
}: {
  next: NextUp | null | undefined;
  className?: string;
}) {
  const { lang, t } = useLang();
  if (!next) return null;

  const ref = new Date();
  ref.setDate(ref.getDate() + next.daysAhead);
  const dayLabel =
    next.daysAhead === 0
      ? t("laterToday")
      : next.daysAhead === 1
      ? t("tomorrow")
      : weekdayName(ref, lang, next.daysAhead < 7 ? "short" : "long");

  const meal = t(MEAL_KEY[next.mealKey]);
  const range = rangeLabel(next.start, next.end);

  return (
    <p className={`text-[12px] font-medium text-ink-soft ${className}`}>
      {t("nextAtMeal", {
        day: dayLabel,
        meal,
        location: next.locationName,
        range,
      })}
    </p>
  );
}

/**
 * Soft-green "planned for this day" badge shown when the day selector is set to
 * a specific day (not Today). Carries the planned hours; live open/boosted
 * treatment does not apply on a non-today view.
 */
export function DayPlanBadge({
  plan,
  className = "",
}: {
  plan: DayPlan;
  className?: string;
}) {
  const { lang } = useLang();
  const day = weekdayName(plan.date, lang, "short");
  const range = plan.slotsLabel ?? rangeLabel(plan.start, plan.end);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-green-700 ring-1 ring-inset ring-green-500/25 ${className}`}
    >
      {plan.fromEvent && <span className="normal-case">🎪</span>}
      {day}
      {range && ` · ${range}`}
    </span>
  );
}

interface StatusPillProps {
  status: TruckStatus;
  unclaimed?: boolean;
  className?: string;
}

/**
 * The three-tier status badge:
 *   Boosted — bright green, pulsing beacon
 *   Open    — soft green, no animation
 *   Closed  — grey
 */
export function StatusPill({ status, unclaimed, className = "" }: StatusPillProps) {
  const { t } = useLang();
  if (unclaimed) {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-neutral-600 shadow-sm ${className}`}
      >
        Unclaimed
      </span>
    );
  }

  const { tier } = status;
  // Minimise the negative "Closed" wording — a closed truck reads as "Planned"
  // (grey) and the forward-looking NextUpLine carries when/where they'll be.
  const label = tier === "closed" ? t("planned") : status.label;
  const tone =
    tier === "boosted"
      ? "bg-[#16a34a] text-white"
      : tier === "open"
      ? "bg-green-100 text-green-700 ring-1 ring-inset ring-green-500/25"
      : "bg-neutral-200 text-neutral-600";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide shadow-sm ${tone} ${className}`}
    >
      {tier === "boosted" && (
        <span className="relative flex h-1.5 w-1.5 text-white/90">
          <span className="live-beacon absolute inset-0" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {label}
    </span>
  );
}
