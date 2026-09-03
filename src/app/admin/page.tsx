import { supabase } from "@/lib/supabase";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { readBoost, isBoostActive } from "@/lib/geo";
import type { Truck, QrRedirect } from "@/lib/types";
import AdminApp, { type AdminTruck, type AdminUser } from "@/components/admin/AdminApp";

export const dynamic = "force-dynamic";

function claimStatusOf(t: Truck): "unclaimed" | "pending" | "claimed" {
  return (t.claim_status as "unclaimed" | "pending" | "claimed" | null) ??
    (t.is_claimed ? "claimed" : "unclaimed");
}

export default async function AdminDashboardPage() {
  const service = getServiceSupabase();
  const now = new Date();

  const [{ data: truckRows }, { data: redirects }, reviewsRes] = await Promise.all([
    supabase.from("trucks").select("*").order("created_at", { ascending: false }),
    supabase.from("qr_redirects").select("truck_id, scan_count"),
    supabase.from("reviews").select("id, truck_id"),
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

  const trucks: AdminTruck[] = ((truckRows ?? []) as Truck[]).map((t) => ({
    ...t,
    claim_status: claimStatusOf(t),
    scans: scansByTruck.get(t.id) ?? 0,
    reviewCount: reviewsByTruck.get(t.id) ?? 0,
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

  return <AdminApp trucks={trucks} users={users} hasServiceRole={Boolean(service)} />;
}
