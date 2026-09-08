import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import type { EventWithTrucks } from "@/lib/types";
import { EVENT_TYPE_META, normalizeEventType } from "@/lib/types";
import { formatEventDateRange, formatEventTime } from "@/lib/eventFormat";
import EventTypeBadge from "@/components/shared/EventTypeBadge";

/**
 * One upcoming event for a truck. "grid" = tall card (full page), "row" =
 * horizontal media row (slide-over).
 */
export default function TruckEventCard({
  event,
  variant = "grid",
}: {
  event: EventWithTrucks;
  variant?: "grid" | "row";
}) {
  const meta = EVENT_TYPE_META[normalizeEventType(event.event_type)];
  const time = formatEventTime(event.start_time, event.end_time);
  const dateLine = (
    <>
      {formatEventDateRange(event.start_date, event.end_date)}
      {time && ` · ${time}`}
    </>
  );

  if (variant === "row") {
    return (
      <Link
        href={`/events/${event.id}`}
        className="group flex gap-3 overflow-hidden rounded-2xl border border-line bg-card p-2.5 shadow-paper transition hover:border-brand-200"
      >
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-brand-50">
          {event.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.image_url} alt={event.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl">{meta.emoji}</div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col py-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <EventTypeBadge type={event.event_type} />
          </div>
          <p className="mt-1 text-[14px] font-bold leading-tight text-ink group-hover:text-brand-700">
            {event.name}
          </p>
          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-brand">
            {dateLine}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[12px] text-ink-soft">
            <MapPin className="h-3 w-3 flex-shrink-0 text-muted" />
            <span className="truncate">{event.location_name}</span>
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-paper transition hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-brand-50">
        {event.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.image_url}
            alt={event.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl">{meta.emoji}</div>
        )}
        <div className="absolute left-3 top-3">
          <EventTypeBadge type={event.event_type} size="md" className="bg-white/95 backdrop-blur-sm" />
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/60 to-transparent p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white">
            <CalendarDays className="h-3.5 w-3.5" />
            {dateLine}
          </p>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[15px] font-bold leading-snug text-ink group-hover:text-brand-700">
          {event.name}
        </h3>
        <p className="mt-1 flex items-start gap-1.5 text-[13px] text-ink-soft">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted" />
          <span className="line-clamp-1">{event.location_name}</span>
        </p>
        <div className="mt-3 flex flex-1 items-end justify-between gap-2 text-[12px] font-medium text-muted">
          {event.trucks.length > 1 ? (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {event.trucks.length} trucks
            </span>
          ) : (
            <span />
          )}
          {event.interestedCount > 0 && <span>{event.interestedCount} interested</span>}
        </div>
      </div>
    </Link>
  );
}
