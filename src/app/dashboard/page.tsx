import { redirect } from "next/navigation";
import { getCurrentUserProfile, createClient } from "@/lib/supabase/server";
import type { Truck, TruckSchedule, TruckPhoto, Review } from "@/lib/types";
import { normalizeMenuItems } from "@/lib/menu";
import { getMondayFirstDay } from "@/lib/geo";
import DashboardApp, { type DashboardStats } from "@/components/dashboard/DashboardApp";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

export default async function DashboardPage() {
  const auth = await getCurrentUserProfile();
  if (!auth) redirect("/login?next=/dashboard");
  if (auth.profile?.role !== "truck_owner" || !auth.profile.truck_id) {
    redirect("/register-truck");
  }

  const truckId = auth.profile.truck_id;
  const supabase = createClient();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ninetyDaysAgo = new Date(now.getTime() - 90 * DAY).toISOString();

  const [
    { data: truck },
    { data: schedules },
    { data: photos },
    { data: reviews },
    { data: viewRows },
    { data: favRows },
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
      .select("viewed_at")
      .eq("truck_id", truckId)
      .gte("viewed_at", ninetyDaysAgo),
    supabase.from("user_favorites").select("created_at").eq("truck_id", truckId),
  ]);

  if (!truck) redirect("/register-truck");

  const views = (viewRows ?? []) as { viewed_at: string }[];
  const favs = (favRows ?? []) as { created_at: string }[];
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

  // ---- Average views by weekday (Mon-first), over the 90-day window ----
  const weekdayTotals = Array(7).fill(0);
  const weekdayObserved = Array(7).fill(0);
  {
    const seen = new Set<string>();
    for (let i = 0; i < 90; i++) {
      const d = new Date(startOfToday.getTime() - i * DAY);
      weekdayObserved[getMondayFirstDay(d)] += 1;
      seen.add(d.toDateString());
    }
    for (const v of views) {
      const d = new Date(v.viewed_at);
      if (seen.has(d.toDateString())) weekdayTotals[getMondayFirstDay(d)] += 1;
    }
  }
  const byWeekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, idx) => ({
    label,
    value: weekdayObserved[idx] ? Math.round((weekdayTotals[idx] / weekdayObserved[idx]) * 10) / 10 : 0,
  }));

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

  const reviewList = (reviews ?? []) as Review[];
  const avgRating =
    reviewList.length > 0
      ? Math.round((reviewList.reduce((s, r) => s + r.rating, 0) / reviewList.length) * 10) / 10
      : 0;

  const liveRow = ((schedules ?? []) as TruckSchedule[]).find((s) => s.specific_date != null) ?? null;

  const stats: DashboardStats = {
    viewsToday,
    views7,
    followers: favs.length,
    menuItemCount: menuItems.length,
    reviewCount: reviewList.length,
    avgRating,
    weeklyViews,
    byWeekday,
    followerGrowth,
  };

  return (
    <DashboardApp
      truck={truck as Truck}
      schedules={(schedules ?? []) as TruckSchedule[]}
      photos={(photos ?? []) as TruckPhoto[]}
      reviews={reviewList}
      liveRow={liveRow}
      stats={stats}
      ownerName={auth.profile.display_name ?? null}
    />
  );
}
