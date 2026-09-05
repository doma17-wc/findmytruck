import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import type { EventWithTrucks } from "@/lib/types";
import { EVENT_TYPE_META, normalizeEventType } from "@/lib/types";
import { formatEventDateRange, formatEventTime } from "@/lib/eventFormat";
import EventTypeBadge from "@/components/shared/EventTypeBadge";
import EventRsvpButton from "./EventRsvpButton";

function TruckLogos({ trucks }: { trucks: EventWithTrucks["trucks"] }) {
  if (trucks.length === 0) return null;
  const shown = trucks.slice(0, 4);
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {shown.map((t) =>
          t.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={t.id}
              src={t.logo_url}
              alt={t.name}
              className="h-7 w-7 rounded-full border-2 border-white bg-white object-cover"
            />
          ) : (
            <span
              key={t.id}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand-100 text-[11px] font-bold text-brand-700"
            >
              {t.name.charAt(0)}
            </span>
          )
        )}
      </div>
      <span className="text-xs font-medium text-neutral-500">
        {trucks.length === 1 ? trucks[0].name : `${trucks.length} trucks`}
        {trucks.length > 4 && " +"}
      </span>
    </div>
  );
}

export default function EventCard({
  event,
  signedIn,
  interested,
}: {
  event: EventWithTrucks;
  signedIn: boolean;
  interested: boolean;
}) {
  const meta = EVENT_TYPE_META[normalizeEventType(event.event_type)];
  const time = formatEventTime(event.start_time, event.end_time);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover">
      <Link href={`/events/${event.id}`} className="block">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-brand-50">
          {event.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.image_url}
              alt={event.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center text-5xl ${meta.badge.split(" ")[0]}`}
            >
              {meta.emoji}
            </div>
          )}
          <div className="absolute left-3 top-3">
            <EventTypeBadge type={event.event_type} size="md" className="bg-white/95 backdrop-blur-sm" />
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatEventDateRange(event.start_date, event.end_date)}
              {time && ` · ${time}`}
            </p>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/events/${event.id}`}>
          <h3 className="text-base font-bold leading-snug text-neutral-900 group-hover:text-brand-700">
            {event.name}
          </h3>
        </Link>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-neutral-500">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-400" />
          <span className="line-clamp-1">{event.location_name}</span>
        </p>

        <div className="mt-3 flex flex-1 items-end justify-between gap-2">
          <TruckLogos trucks={event.trucks} />
          <EventRsvpButton
            eventId={event.id}
            initialInterested={interested}
            initialCount={event.interestedCount}
            signedIn={signedIn}
          />
        </div>
      </div>
    </div>
  );
}
