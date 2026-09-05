import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, LayoutDashboard, Heart, LogOut, MapPin } from "lucide-react";
import { getCurrentUserProfile, createClient } from "@/lib/supabase/server";
import { dateStr } from "@/lib/events";
import { formatEventDateRange } from "@/lib/eventFormat";
import { signOutAction } from "../auth-actions";

export const metadata = { title: "Your profile" };
export const dynamic = "force-dynamic";

interface InterestedEvent {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location_name: string;
  image_url: string | null;
}

export default async function AccountPage() {
  const auth = await getCurrentUserProfile();
  if (!auth) redirect("/login?next=/account");

  const { user, profile } = auth;
  const isOwner = profile?.role === "truck_owner";

  let interestedEvents: InterestedEvent[] = [];
  if (!isOwner) {
    const supabase = createClient();
    const { data: rsvps } = await supabase
      .from("event_rsvps")
      .select("event_id")
      .eq("user_id", user.id);
    const ids = ((rsvps ?? []) as { event_id: string }[]).map((r) => r.event_id);
    if (ids.length > 0) {
      const { data: evs } = await supabase
        .from("events")
        .select("id, name, start_date, end_date, location_name, image_url")
        .in("id", ids)
        .gte("end_date", dateStr())
        .order("start_date", { ascending: true });
      interestedEvents = (evs ?? []) as InterestedEvent[];
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-xl font-bold text-white">
            {(profile?.display_name || user.email || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-neutral-900">
              {profile?.display_name || "FindMyTruck user"}
            </p>
            <p className="truncate text-sm text-neutral-500">{user.email}</p>
          </div>
        </div>

        <span className="mt-4 inline-block rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand">
          {isOwner ? "Truck owner" : "Customer"}
        </span>

        <div className="mt-6 space-y-2">
          {isOwner ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-xl border border-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              <LayoutDashboard className="h-[18px] w-[18px] text-brand" />
              Go to truck dashboard
            </Link>
          ) : (
            <Link
              href="/favorites"
              className="flex items-center gap-3 rounded-xl border border-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              <Heart className="h-[18px] w-[18px] text-brand" />
              My favorites
            </Link>
          )}

          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl border border-neutral-100 px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Sign out
            </button>
          </form>
        </div>
      </div>

      {!isOwner && (
        <div className="mt-6 rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
          <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
            <CalendarDays className="h-[18px] w-[18px] text-brand" />
            Events you&apos;re interested in
          </h2>
          {interestedEvents.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">
              Nothing yet.{" "}
              <Link href="/events" className="font-semibold text-brand hover:underline">
                Browse what&apos;s happening
              </Link>
              .
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {interestedEvents.map((e) => (
                <Link
                  key={e.id}
                  href={`/events/${e.id}`}
                  className="flex items-center gap-3 rounded-xl border border-neutral-100 p-2.5 transition hover:border-brand-200 hover:bg-brand-50/40"
                >
                  {e.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.image_url}
                      alt=""
                      className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xl">
                      🎪
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900">{e.name}</p>
                    <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-brand">
                      {formatEventDateRange(e.start_date, e.end_date)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{e.location_name}</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
