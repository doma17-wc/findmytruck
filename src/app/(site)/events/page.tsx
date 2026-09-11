import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { getAllUpcomingEvents } from "@/lib/events";
import { getCurrentUserProfile, createClient } from "@/lib/supabase/server";
import { EVENT_TYPE_META, EVENT_TYPE_OPTIONS, normalizeEventType } from "@/lib/types";
import { OG_LOCALE_DEFAULTS } from "@/lib/seo";
import EventCard from "@/components/events/EventCard";

export const dynamic = "force-dynamic";

const TITLE = "Streetfood Festivals & Foodtruck Events Schweiz";
const DESCRIPTION =
  "Foodtruck-Events, Streetfood-Festivals und Märkte in der ganzen Schweiz — sieh, welche Foodtrucks wann und wo dabei sind, und melde dich direkt an.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://findmytruck.ch/events" },
  openGraph: {
    ...OG_LOCALE_DEFAULTS,
    title: TITLE,
    description: DESCRIPTION,
    url: "https://findmytruck.ch/events",
    type: "website",
  },
};

export default async function EventsPage() {
  const events = await getAllUpcomingEvents();

  const auth = await getCurrentUserProfile();
  let interestedIds = new Set<string>();
  if (auth) {
    const supabase = createClient();
    const { data } = await supabase
      .from("event_rsvps")
      .select("event_id")
      .eq("user_id", auth.user.id);
    interestedIds = new Set(((data ?? []) as { event_id: string }[]).map((r) => r.event_id));
  }

  // Which categories are actually represented, for a light filter legend.
  const presentTypes = EVENT_TYPE_OPTIONS.filter((t) =>
    events.some((e) => normalizeEventType(e.event_type) === t)
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-16">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white">
          <CalendarDays className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
            Was läuft
          </h1>
          <p className="text-[15px] text-neutral-600">
            Streetfood-Festivals, Märkte &amp; Foodtruck-Events in der ganzen Schweiz
          </p>
        </div>
      </div>

      {presentTypes.length > 1 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {presentTypes.map((t) => {
            const meta = EVENT_TYPE_META[t];
            return (
              <span
                key={t}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.badge}`}
              >
                <span>{meta.emoji}</span>
                {meta.label}
              </span>
            );
          })}
        </div>
      )}

      {events.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-neutral-200 py-16 text-center">
          <p className="text-4xl">🎪</p>
          <p className="mt-3 text-sm text-neutral-500">
            Aktuell keine bevorstehenden Events. Schau bald wieder vorbei!
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              signedIn={Boolean(auth)}
              interested={interestedIds.has(e.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
