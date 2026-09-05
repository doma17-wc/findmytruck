import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Link2, MapPin } from "lucide-react";
import { getAllUpcomingEvents } from "@/lib/events";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Events — Food Trucks in Switzerland",
  description:
    "Upcoming food truck festivals, markets, and private events across Switzerland — see which trucks are attending and when.",
  alternates: { canonical: "https://findmytruck.ch/events" },
};

function formatEventDate(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };
  const s = new Date(`${start}T00:00:00`).toLocaleDateString("en", opts);
  if (start === end) return s;
  const e = new Date(`${end}T00:00:00`).toLocaleDateString("en", opts);
  return `${s} – ${e}`;
}

export default async function EventsPage() {
  const events = await getAllUpcomingEvents();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-16">
      <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">Events</h1>
      <p className="mt-2 text-[15px] text-neutral-600">
        Festivals, markets, and private events happening around Switzerland — see which food
        trucks will be there.
      </p>

      {events.length === 0 ? (
        <p className="mt-10 text-center text-sm text-neutral-500">
          No upcoming events right now. Check back soon!
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {events.map((e) => (
            <div key={e.id} className="rounded-2xl border border-neutral-100 p-5 shadow-card">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-brand">
                    {formatEventDate(e.start_date, e.end_date)}
                    {e.start_time && ` · ${e.start_time.slice(0, 5)}–${(e.end_time ?? "").slice(0, 5)}`}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-neutral-900">{e.name}</h2>
                  <p className="mt-1.5 flex items-start gap-1.5 text-sm text-neutral-600">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-400" />
                    {e.location_name}
                  </p>
                  {e.description && <p className="mt-2 text-sm text-neutral-600">{e.description}</p>}

                  {e.trucks.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {e.trucks.map((t) => (
                        <Link
                          key={t.id}
                          href={`/trucks/${t.slug}`}
                          className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700 transition hover:bg-brand-50 hover:text-brand"
                        >
                          {t.name}
                        </Link>
                      ))}
                    </div>
                  )}

                  {e.link && (
                    <a
                      href={e.link.startsWith("http") ? e.link : `https://${e.link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
                    >
                      <Link2 className="h-4 w-4" />
                      More details
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
