import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, Link2, MapPin } from "lucide-react";
import { getEventById } from "@/lib/events";
import { getCurrentUserProfile, createClient } from "@/lib/supabase/server";
import { formatEventDateRange, formatEventTime } from "@/lib/eventFormat";
import { OG_LOCALE_DEFAULTS } from "@/lib/seo";
import EventTypeBadge from "@/components/shared/EventTypeBadge";
import EventRsvpButton from "@/components/events/EventRsvpButton";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getEventById(params.id);
  if (!event) return { title: "Event nicht gefunden" };
  const date = formatEventDateRange(event.start_date, event.end_date, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const title = `${event.name} – ${date}`;
  const description =
    event.description ??
    `${event.name} in ${event.location_name}, ${date}. Sieh, welche Foodtrucks dabei sind.`;
  return {
    title,
    description,
    alternates: { canonical: `https://findmytruck.ch/events/${event.id}` },
    openGraph: {
      ...OG_LOCALE_DEFAULTS,
      title,
      description,
      url: `https://findmytruck.ch/events/${event.id}`,
      type: "website",
      ...(event.image_url && { images: [{ url: event.image_url }] }),
    },
  };
}

export default async function EventDetailPage({ params }: Props) {
  const event = await getEventById(params.id);
  if (!event) notFound();

  const auth = await getCurrentUserProfile();
  let interested = false;
  if (auth) {
    const supabase = createClient();
    const { data } = await supabase
      .from("event_rsvps")
      .select("event_id")
      .eq("user_id", auth.user.id)
      .eq("event_id", event.id)
      .maybeSingle();
    interested = Boolean(data);
  }

  const date = formatEventDateRange(event.start_date, event.end_date, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const time = formatEventTime(event.start_time, event.end_time);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${event.location_lat},${event.location_lng}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    inLanguage: "de-CH",
    description: event.description ?? undefined,
    image: event.image_url ?? undefined,
    startDate: `${event.start_date}${event.start_time ? `T${event.start_time}` : ""}`,
    endDate: `${event.end_date}${event.end_time ? `T${event.end_time}` : ""}`,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: event.location_name,
      address: { "@type": "PostalAddress", addressCountry: "CH" },
      geo: {
        "@type": "GeoCoordinates",
        latitude: event.location_lat,
        longitude: event.location_lng,
      },
    },
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 transition hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Alle Events
      </Link>

      <div className="mt-4 overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-card">
        <div className="relative aspect-[16/9] w-full bg-brand-50">
          {event.image_url ? (
            <Image
              src={event.image_url}
              alt={event.name}
              fill
              priority
              sizes="(max-width: 672px) 100vw, 672px"
              quality={90}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-6xl">🎪</div>
          )}
        </div>

        <div className="p-5 sm:p-6">
          <EventTypeBadge type={event.event_type} size="md" />
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-neutral-900">{event.name}</h1>

          <div className="mt-4 space-y-2.5 text-[15px] text-neutral-700">
            <p className="flex items-center gap-2.5">
              <CalendarDays className="h-4 w-4 flex-shrink-0 text-brand" />
              <span className="font-semibold">{date}</span>
            </p>
            {time && (
              <p className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 flex-shrink-0 text-brand" />
                {time}
              </p>
            )}
            <p className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" />
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {event.location_name}
              </a>
            </p>
          </div>

          {event.description && (
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-600">
              {event.description}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <EventRsvpButton
              eventId={event.id}
              initialInterested={interested}
              initialCount={event.interestedCount}
              signedIn={Boolean(auth)}
              variant="full"
            />
            {event.link && (
              <a
                href={event.link.startsWith("http") ? event.link : `https://${event.link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
              >
                <Link2 className="h-4 w-4" />
                Mehr Infos
              </a>
            )}
          </div>

          {event.trucks.length > 0 && (
            <div className="mt-6 border-t border-neutral-100 pt-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
                Trucks bei diesem Event
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {event.trucks.map((t) => (
                  <Link
                    key={t.id}
                    href={`/trucks/${t.slug}`}
                    className="flex items-center gap-3 rounded-xl border border-neutral-100 p-2.5 transition hover:border-brand-200 hover:bg-brand-50/40"
                  >
                    {t.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.logo_url}
                        alt={t.name}
                        className="h-9 w-9 rounded-full bg-white object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                        {t.name.charAt(0)}
                      </span>
                    )}
                    <span className="truncate text-sm font-semibold text-neutral-800">{t.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
