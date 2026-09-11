import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUserProfile, getOwnedTrucks, createClient } from "@/lib/supabase/server";
import type { Truck, TruckSchedule, TruckPhoto, Review } from "@/lib/types";
import { normalizeMenuItems } from "@/lib/menu";
import { readBoost, isBoostActive } from "@/lib/geo";
import { getDashboardEvents } from "@/lib/events";
import { DASH_TRUCK_COOKIE, resolveSelectedTruck } from "@/lib/dashboardTruck";
import DashboardApp, { type DashboardStats } from "@/components/dashboard/DashboardApp";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

/** Local-date string (YYYY-MM-DD), matching the `date` column truck_impressions
 * groups by -- comparable directly since Postgres returns dates as this same
 * "YYYY-MM-DD" string shape. */
function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { truck?: string };
}) {
  const auth = await getCurrentUserProfile();
  if (!auth) redirect("/login?next=/dashboard");

  const ownedTrucks = await getOwnedTrucks();
  if (ownedTrucks.length === 0) {
    // No trucks linked to this account yet.
    redirect("/register-truck");
  }

  const selected = resolveSelectedTruck(ownedTrucks, {
    paramTruckId: searchParams.truck,
    cookieTruckId: cookies().get(DASH_TRUCK_COOKIE)?.value,
    defaultTruckId: auth.profile?.truck_id,
  });
  const truckId = (selected ?? ownedTrucks[0]).id;

  const supabase = createClient();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ninetyDaysAgo = new Date(now.getTime() - 90 * DAY).toISOString();

  const twentyEightDaysAgo = dateStr(new Date(startOfToday.getTime() - 27 * DAY));
  const thirtyDaysAgoIso = new Date(startOfToday.getTime() - 29 * DAY).toISOString();

  const [
    { data: truck },
    { data: schedules },
    { data: photos },
    { data: reviews },
    { data: viewRows },
    { data: favRows },
    { data: impressionRows },
    { data: qrRows },
    { data: contentViewRows },
    { data: ownerActivityRow },
    { data: ownerActivityDailyRows },
    dashboardEvents,
  ] = await Promise.all([
    supabase.from("trucks").select("*").eq("id", truckId).maybeSingle(),
    supabase.from("truck_schedules").select("*").eq("truck_id", truckId).order("day_of_week"),
    supabase.from("truck_photos").select("*").eq("truck_id", truckId).order("sort_order"),
    supabase
      .from("reviews")
      .select("*")
      .eq("truck_id", truckId)
      .order("created_at", { ascending: false }),
    supabase
      .from("truck_page_views")
      .select("viewed_at, source")
      .eq("truck_id", truckId)
      .gte("viewed_at", ninetyDaysAgo),
    supabase.from("user_favorites").select("created_at").eq("truck_id", truckId),
    supabase
      .from("truck_impressions")
      .select("date, count")
      .eq("truck_id", truckId)
      .gte("date", twentyEightDaysAgo),
    supabase.from("qr_redirects").select("scan_count").eq("truck_id", truckId),
    supabase
      .from("truck_content_views")
      .select("content_type, content_key, count")
      .eq("truck_id", truckId)
      .gte("date", dateStr(new Date(thirtyDaysAgoIso))),
    supabase
      .from("owner_activity")
      .select("visit_count, last_seen_at, last_content_update_at")
      .eq("user_id", auth.user.id)
      .eq("truck_id", truckId)
      .maybeSingle(),
    supabase
      .from("owner_activity_daily")
      .select("count")
      .eq("user_id", auth.user.id)
      .eq("truck_id", truckId)
      .gte("date", dateStr(new Date(thirtyDaysAgoIso))),
    getDashboardEvents(truckId),
  ]);

  if (!truck) redirect("/dashboard");

  // Fire-and-forget: records this dashboard visit for admin's owner-engagement
  // view (active vs dormant trucks). Never blocks the page render.
  void supabase.rpc("record_owner_activity", { p_truck_id: truckId });

  const views = (viewRows ?? []) as { viewed_at: string; source: string | null }[];
  const favs = (favRows ?? []) as { created_at: string }[];
  const impressionsByDate = new Map(
    ((impressionRows ?? []) as { date: string; count: number }[]).map((r) => [r.date, r.count])
  );
  const menuItems = normalizeMenuItems((truck as Truck).menu_items);

  // ---- Views: today, last 7 days, and a 7-day daily series ----
  const viewsToday = views.filter((v) => new Date(v.viewed_at) >= startOfToday).length;

  const weeklyViews: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(startOfToday.getTime() - i * DAY);
    const dayEnd = new Date(dayStart.getTime() + DAY);
    weeklyViews.push({
      label: dayStart.toLocaleDateString("en", { weekday: "short" }),
      value: views.filter((v) => {
        const d = new Date(v.viewed_at);
        return d >= dayStart && d < dayEnd;
      }).length,
    });
  }
  const views7 = weeklyViews.reduce((sum, d) => sum + d.value, 0);

  // ---- Views the week before that (7-13 days ago), for the conversion trend ----
  const prevWeekStart = new Date(startOfToday.getTime() - 13 * DAY);
  const prevWeekEnd = new Date(startOfToday.getTime() - 6 * DAY);
  const viewsPrev7 = views.filter((v) => {
    const d = new Date(v.viewed_at);
    return d >= prevWeekStart && d < prevWeekEnd;
  }).length;

  // ---- Impressions: today, this week, last week (for the trend), and a
  // 7-day daily series -- summed from the daily counter, not one row per hit.
  const impressionsToday = impressionsByDate.get(dateStr(startOfToday)) ?? 0;

  const weeklyImpressions: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(startOfToday.getTime() - i * DAY);
    weeklyImpressions.push({
      label: day.toLocaleDateString("en", { weekday: "short" }),
      value: impressionsByDate.get(dateStr(day)) ?? 0,
    });
  }
  const impressions7 = weeklyImpressions.reduce((sum, d) => sum + d.value, 0);

  let impressionsPrev7 = 0;
  for (let i = 13; i >= 7; i--) {
    const day = new Date(startOfToday.getTime() - i * DAY);
    impressionsPrev7 += impressionsByDate.get(dateStr(day)) ?? 0;
  }

  // ---- Views & impressions over the last 4 weeks, bucketed by week (for the
  // dashboard's 7d/30d toggle) ----
  const monthlyViewsByWeek: { label: string; value: number }[] = [];
  const monthlyImpressionsByWeek: { label: string; value: number }[] = [];
  for (let w = 3; w >= 0; w--) {
    const weekEndExclusive = new Date(startOfToday.getTime() - w * 7 * DAY + DAY);
    const weekStart = new Date(weekEndExclusive.getTime() - 7 * DAY);
    const label = new Date(weekEndExclusive.getTime() - DAY).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
    });
    const viewsCount = views.filter((v) => {
      const d = new Date(v.viewed_at);
      return d >= weekStart && d < weekEndExclusive;
    }).length;
    let impCount = 0;
    for (let d = new Date(weekStart); d < weekEndExclusive; d = new Date(d.getTime() + DAY)) {
      impCount += impressionsByDate.get(dateStr(d)) ?? 0;
    }
    monthlyViewsByWeek.push({ label, value: viewsCount });
    monthlyImpressionsByWeek.push({ label, value: impCount });
  }

  // ---- Best days / best times: Europe/Zurich local calendar day & hour, not
  // the server's (UTC on Vercel) -- otherwise every bucket would be off by a
  // few hours for Swiss visitors. ----
  const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const zurichWeekdayIdx = (d: Date) => {
    const name = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Zurich", weekday: "short" }).format(d);
    return WEEKDAY_LABELS.indexOf(name);
  };
  const zurichDateKey = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(d);
  const zurichHour = (d: Date) =>
    parseInt(
      new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Zurich", hour: "2-digit", hour12: false }).format(d),
      10
    ) % 24;

  // Average views by weekday, over the 90-day window.
  const weekdayTotals = Array(7).fill(0);
  const weekdayObserved = Array(7).fill(0);
  {
    const seen = new Set<string>();
    for (let i = 0; i < 90; i++) {
      const d = new Date(startOfToday.getTime() - i * DAY);
      weekdayObserved[zurichWeekdayIdx(d)] += 1;
      seen.add(zurichDateKey(d));
    }
    for (const v of views) {
      const d = new Date(v.viewed_at);
      if (seen.has(zurichDateKey(d))) weekdayTotals[zurichWeekdayIdx(d)] += 1;
    }
  }
  const byWeekday = WEEKDAY_LABELS.map((label, idx) => ({
    label,
    value: weekdayObserved[idx] ? Math.round((weekdayTotals[idx] / weekdayObserved[idx]) * 10) / 10 : 0,
  }));

  // Total views by time of day, over the same 90-day window.
  const HOUR_BUCKET_LABELS = ["12–4am", "4–8am", "8am–12pm", "12–4pm", "4–8pm", "8pm–12am"];
  const hourTotals = Array(6).fill(0);
  for (const v of views) {
    hourTotals[Math.floor(zurichHour(new Date(v.viewed_at)) / 4)] += 1;
  }
  const byHour = HOUR_BUCKET_LABELS.map((label, i) => ({ label, value: hourTotals[i] }));

  // ---- Follower growth: cumulative total at the end of each of the last 8 weeks ----
  const sortedFavDates = favs.map((f) => new Date(f.created_at).getTime()).sort((a, b) => a - b);
  const followerGrowth: { label: string; value: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekEnd = startOfToday.getTime() - i * 7 * DAY + DAY;
    followerGrowth.push({
      label: new Date(weekEnd - DAY).toLocaleDateString("en", { month: "short", day: "numeric" }),
      value: sortedFavDates.filter((t) => t <= weekEnd).length,
    });
  }

  const newFollowers7 = favs.filter((f) => new Date(f.created_at) >= new Date(startOfToday.getTime() - 6 * DAY))
    .length;

  // ---- Where views come from, over the last 30 days ----
  const thirtyDaysAgoStart = new Date(startOfToday.getTime() - 29 * DAY);
  const SOURCE_LABELS: Record<string, string> = {
    map: "Map",
    list: "Browse list",
    profile: "Direct link",
    qr: "QR scan",
  };
  const sourceCounts: Record<string, number> = {};
  for (const v of views) {
    if (new Date(v.viewed_at) < thirtyDaysAgoStart) continue;
    const key = v.source ?? "profile";
    sourceCounts[key] = (sourceCounts[key] ?? 0) + 1;
  }
  const viewSources = (["map", "list", "profile", "qr"] as const).map((key) => ({
    label: SOURCE_LABELS[key],
    value: sourceCounts[key] ?? 0,
  }));

  const qrScans = ((qrRows ?? []) as { scan_count: number }[]).reduce(
    (sum, r) => sum + (r.scan_count ?? 0),
    0
  );

  // ---- What people look at: top menu items / photos, last 30 days ----
  const contentRows = (contentViewRows ?? []) as { content_type: string; content_key: string; count: number }[];
  const menuTotals = new Map<string, number>();
  const photoTotals = new Map<string, number>();
  for (const r of contentRows) {
    const map = r.content_type === "menu_item" ? menuTotals : photoTotals;
    map.set(r.content_key, (map.get(r.content_key) ?? 0) + r.count);
  }
  const topMenuItems = [...menuTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));
  const topPhotos = [...photoTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, value]) => {
      const idx = Number(key);
      return { label: Number.isFinite(idx) ? `Photo ${idx + 1}` : "Photo", value };
    });

  const reviewList = (reviews ?? []) as Review[];
  const avgRating =
    reviewList.length > 0
      ? Math.round((reviewList.reduce((s, r) => s + r.rating, 0) / reviewList.length) * 10) / 10
      : 0;

  const boost = readBoost(truck as Truck);
  const boosted = isBoostActive(boost, now);

  // ---- Owner's own engagement: a friendly nudge, not a surveillance panel ----
  const ownerActivity = ownerActivityRow as {
    visit_count: number;
    last_seen_at: string;
    last_content_update_at: string | null;
  } | null;
  const ownerVisits30 = ((ownerActivityDailyRows ?? []) as { count: number }[]).reduce(
    (s, r) => s + r.count,
    0
  );

  const stats: DashboardStats = {
    viewsToday,
    views7,
    viewsPrev7,
    impressionsToday,
    impressions7,
    impressionsPrev7,
    followers: favs.length,
    newFollowers7,
    menuItemCount: menuItems.length,
    reviewCount: reviewList.length,
    avgRating,
    weeklyViews,
    weeklyImpressions,
    monthlyViewsByWeek,
    monthlyImpressionsByWeek,
    byWeekday,
    byHour,
    followerGrowth,
    viewSources,
    qrScans,
    topMenuItems,
    topPhotos,
    ownerVisits30,
    ownerVisitsTotal: ownerActivity?.visit_count ?? 0,
    ownerLastContentUpdateAt: ownerActivity?.last_content_update_at ?? null,
  };

  return (
    <DashboardApp
      truck={truck as Truck}
      ownedTrucks={ownedTrucks}
      schedules={(schedules ?? []) as TruckSchedule[]}
      photos={(photos ?? []) as TruckPhoto[]}
      reviews={reviewList}
      events={dashboardEvents}
      boosted={boosted}
      boostExpiresAt={boost.expiresAt ? boost.expiresAt.toISOString() : null}
      boostStartedAt={boost.startedAt ? boost.startedAt.toISOString() : null}
      stats={stats}
      ownerName={auth.profile?.display_name ?? null}
      ownerEmail={auth.user.email ?? ""}
    />
  );
}
