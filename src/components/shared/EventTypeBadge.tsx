import {
  PartyPopper,
  Store,
  UtensilsCrossed,
  Sparkles,
  Truck,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { EVENT_TYPE_META, normalizeEventType, type EventType } from "@/lib/types";

const ICONS: Record<EventType, LucideIcon> = {
  festival: PartyPopper,
  market: Store,
  catering: UtensilsCrossed,
  street_food: Truck,
  opening: Sparkles,
  other: MapPin,
};

export function eventTypeIcon(type: unknown): LucideIcon {
  return ICONS[normalizeEventType(type)];
}

/** Small pill: coloured icon + label for an event category. */
export default function EventTypeBadge({
  type,
  className = "",
  size = "sm",
}: {
  type: unknown;
  className?: string;
  size?: "sm" | "md";
}) {
  const meta = EVENT_TYPE_META[normalizeEventType(type)];
  const Icon = ICONS[meta.key];
  const pad = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";
  const icon = size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${pad} ${meta.badge} ${className}`}
    >
      <Icon className={icon} />
      {meta.label}
    </span>
  );
}
