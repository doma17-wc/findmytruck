import { supabase } from "@/lib/supabase";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { readBoost, isBoostActive } from "@/lib/geo";
import type { Truck, QrRedirect } from "@/lib/types";
import { getAllUpcomingEvents } from "@/lib/events";
import AdminApp, { type AdminTruck, type AdminUser } from "@/components/admin/AdminApp";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

function claimStatusOf(t: Truck): "unclaimed" | "pending" | "claimed" {
  return (t.claim_status as "unclaimed" | "pending" | "claimed" | null) ??
    (t.is_claimed ? "claimed" : "unclaimed");
}

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default async function AdminDashboardPage() {
  const service = getServiceSupabase();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY);

  const [
    { data: truckRows },
    { data: redirects },
    reviewsRes,
    { data: impressionRows },
    { data: viewRows },
    events,
  ] = await Promise.all([
    supabase.from("trucks").select("*").order("created_at", { ascending: false }),
    supabase.from("qr_redirects").select("truck_id, scan_count"),
    supabase.from("reviews").select("id, truck_id"),
    supabase
      .from("truck_impressions")
      .select("truck_id, count")
      .gte("date", dateStr(thirtyDaysAgo)),
    supabase
      .from("truck_page_views")
      .select("truck_id")
      .gte("viewed_at", thirtyDaysAgo.toISOString()),
    getAllUpcomingEvents(),
  ]);

  const scansByTruck = new Map<string, number>();
  ((redirects ?? []) as Pick<QrRedirect, "truck_id" | "scan_count">[]).forEach((r) => {
    if (!r.truck_id) return;
    scansByTruck.set(r.truck_id, (scansByTruck.get(r.truck_id) ?? 0) + (r.scan_count ?? 0));
  });

  const reviewsByTruck = new Map<string, number>();
  if (!reviewsRes.error) {
    ((reviewsRes.data ?? []) as { truck_id: string }[]).forEach((r) => {
      reviewsByTruck.set(r.truck_id, (reviewsByTruck.get(r.truck_id) ?? 0) + 1);
    });
  }

  const impressionsByTruck = new Map<string, number>();
  ((impressionRows ?? []) as { truck_id: string; count: number }[]).forEach((r) => {
    impressionsByTruck.set(r.truck_id, (impressionsByTruck.get(r.truck_id) ?? 0) + r.count);
  });

  const viewsByTruck = new Map<string, number>();
  ((viewRows ?? []) as { truck_id: string }[]).forEach((r) => {
    viewsByTruck.set(r.truck_id, (viewsByTruck.get(r.truck_id) ?? 0) + 1);
  });

  const trucks: AdminTruck[] = ((truckRows ?? []) as Truck[]).map((t) => ({
    ...t,
    claim_status: claimStatusOf(t),
    scans: scansByTruck.get(t.id) ?? 0,
    reviewCount: reviewsByTruck.get(t.id) ?? 0,
    impressions30: impressionsByTruck.get(t.id) ?? 0,
    views30: viewsByTruck.get(t.id) ?? 0,
    boostedNow: isBoostActive(readBoost(t), now),
  }));

  // ---- Users (needs the service-role key) ----
  let users: AdminUser[] | null = null;
  if (service) {
    const truckName = new Map(trucks.map((t) => [t.id, t.name]));
    const [{ data: authData }, { data: profiles }] = await Promise.all([
      service.auth.admin.listUsers({ perPage: 1000 }),
      service.from("profiles").select("id, role, truck_id, display_name"),
    ]);
    const profileById = new Map(
      ((profiles ?? []) as {
        id: string;
        role: "customer" | "truck_owner";
        truck_id: string | null;
        display_name: string | null;
      }[]).map((p) => [p.id, p])
    );
    users = (authData?.users ?? []).map((u) => {
      const p = profileById.get(u.id);
      return {
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        role: p?.role ?? null,
        truck_id: p?.truck_id ?? null,
        truck_name: p?.truck_id ? truckName.get(p.truck_id) ?? null : null,
        display_name: p?.display_name ?? null,
      };
    });
    users.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  return <AdminApp trucks={trucks} users={users} events={events} hasServiceRole={Boolean(service)} />;
}
