import { redirect } from "next/navigation";
import { Eye, TrendingUp } from "lucide-react";
import { getCurrentUserProfile, createClient } from "@/lib/supabase/server";
import type { Truck, TruckSchedule, TruckPhoto } from "@/lib/types";
import DashboardTruckForm from "@/components/dashboard/DashboardTruckForm";
import DashboardScheduleManager from "@/components/dashboard/DashboardScheduleManager";
import DashboardPhotoUploader from "@/components/dashboard/DashboardPhotoUploader";

export const metadata = { title: "Truck dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const auth = await getCurrentUserProfile();
  if (!auth) redirect("/login?next=/dashboard");
  if (auth.profile?.role !== "truck_owner" || !auth.profile.truck_id) {
    redirect("/register-truck");
  }

  const truckId = auth.profile.truck_id;
  const supabase = createClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: truck }, { data: schedules }, { data: photos }, { count: totalViews }, { count: recentViews }] =
    await Promise.all([
      supabase.from("trucks").select("*").eq("id", truckId).maybeSingle(),
      supabase.from("truck_schedules").select("*").eq("truck_id", truckId).order("day_of_week"),
      supabase.from("truck_photos").select("*").eq("truck_id", truckId).order("sort_order"),
      supabase.from("truck_page_views").select("id", { count: "exact", head: true }).eq("truck_id", truckId),
      supabase
        .from("truck_page_views")
        .select("id", { count: "exact", head: true })
        .eq("truck_id", truckId)
        .gte("viewed_at", sevenDaysAgo),
    ]);

  if (!truck) redirect("/register-truck");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-16">
      <h1 className="text-2xl font-bold text-neutral-900">Truck dashboard</h1>
      <p className="mt-1 text-sm text-neutral-500">Manage {truck.name}&apos;s public profile.</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-card">
          <div className="flex items-center gap-2 text-neutral-400">
            <Eye className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">All-time views</span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-neutral-900">{totalViews ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-card">
          <div className="flex items-center gap-2 text-neutral-400">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Last 7 days</span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-neutral-900">{recentViews ?? 0}</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-base font-bold text-neutral-900">Truck details</h2>
        <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-card">
          <DashboardTruckForm truck={truck as Truck} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-base font-bold text-neutral-900">Weekly schedule</h2>
        <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-card">
          <DashboardScheduleManager schedules={(schedules ?? []) as TruckSchedule[]} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-base font-bold text-neutral-900">Photo gallery</h2>
        <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-card">
          <DashboardPhotoUploader truckId={truckId} photos={(photos ?? []) as TruckPhoto[]} />
        </div>
      </section>
    </div>
  );
}
