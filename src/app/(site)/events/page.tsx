import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { getAllUpcomingEvents } from "@/lib/events";
import { getCurrentUserProfile, createClient } from "@/lib/supabase/server";
import { EVENT_TYPE_META, EVENT_TYPE_OPTIONS, normalizeEventType } from "@/lib/types";
import EventCard from "@/components/events/EventCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Events — Food Trucks in Switzerland",
  description:
    "Upcoming food truck festivals, markets, and private events across Switzerland — see which trucks are attending and when.",
  alternates: { canonical: "https://findmytruck.ch/events" },
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
            What&apos;s happening
          </h1>
          <p className="text-[15px] text-neutral-600">
            Festivals, markets &amp; food-truck gatherings around Switzerland
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
            No upcoming events right now. Check back soon!
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
