import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, CalendarDays, KeyRound, LayoutDashboard, Heart, LogOut, MapPin, Zap } from "lucide-react";
import { getCurrentUserProfile, createClient } from "@/lib/supabase/server";
import { dateStr } from "@/lib/events";
import { formatEventDateRange } from "@/lib/eventFormat";
import type { Notification } from "@/lib/types";
import NotifyPreferenceToggle from "@/components/notifications/NotifyPreferenceToggle";
import ChangePasswordForm from "@/components/account/ChangePasswordForm";
import PauseAccountSection from "@/components/account/PauseAccountSection";
import DeleteAccountSection from "@/components/account/DeleteAccountSection";
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
  let notifications: Notification[] = [];
  let followedCount = 0;
  if (!isOwner) {
    const supabase = createClient();
    const [{ data: rsvps }, { data: notifs }, { count: favCount }] = await Promise.all([
      supabase.from("event_rsvps").select("event_id").eq("user_id", user.id),
      supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("user_favorites")
        .select("truck_id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);
    notifications = (notifs as Notification[]) ?? [];
    followedCount = favCount ?? 0;

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

  const notifyOn = profile?.notify_follow_live ?? true;
  const paused = Boolean(profile?.deactivated);

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
              Trucks you follow
              {followedCount > 0 && (
                <span className="ml-auto rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand">
                  {followedCount}
                </span>
              )}
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

      {!isOwner && paused && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Your account is paused — we&apos;ve stopped all notifications and e-mails. Your follows
          and reviews are safe. Reactivate below any time.
        </div>
      )}

      {!isOwner && !paused && (
        <div className="mt-6 rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
          <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
            <Bell className="h-[18px] w-[18px] text-brand" />
            Notifications
          </h2>

          <div className="mt-4">
            <NotifyPreferenceToggle initialOn={notifyOn} />
          </div>

          <div className="mt-4 border-t border-neutral-100 pt-4">
            {notifications.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No notifications yet. Follow a truck and you&apos;ll hear when it goes live.
              </p>
            ) : (
              <ul className="space-y-2">
                {notifications.map((n) => {
                  const row = (
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand">
                        <Zap className="h-3.5 w-3.5" fill="currentColor" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-neutral-800">{n.message}</p>
                        <p className="mt-0.5 text-xs text-neutral-400">
                          {new Date(n.created_at).toLocaleString("en", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {n.link ? (
                        <Link
                          href={n.link}
                          className="block rounded-xl p-2 transition hover:bg-neutral-50"
                        >
                          {row}
                        </Link>
                      ) : (
                        <div className="p-2">{row}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {!isOwner && !paused && (
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

      {!isOwner && (
        <div className="mt-6">
          <PauseAccountSection initialPaused={paused} />
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
        <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
          <KeyRound className="h-[18px] w-[18px] text-brand" />
          Change password
        </h2>
        <div className="mt-4">
          <ChangePasswordForm email={user.email ?? ""} />
        </div>
      </div>

      <div className="mt-6">
        <DeleteAccountSection role={isOwner ? "truck_owner" : "customer"} />
      </div>
    </div>
  );
}
