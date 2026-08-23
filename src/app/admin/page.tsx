import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Truck, QrRedirect } from "@/lib/types";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [{ data: trucks }, { data: redirects }] = await Promise.all([
    supabase.from("trucks").select("*").order("created_at", { ascending: false }),
    supabase.from("qr_redirects").select("*"),
  ]);

  const scansByTruck = new Map<string, number>();
  ((redirects ?? []) as QrRedirect[]).forEach((r) => {
    if (!r.truck_id) return;
    scansByTruck.set(r.truck_id, (scansByTruck.get(r.truck_id) ?? 0) + r.scan_count);
  });

  return (
    <div className="min-h-dvh bg-neutral-50 pb-12">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚚</span>
          <span className="text-lg font-bold text-neutral-900">FindMyTruck Admin</span>
        </div>
        <form action={logoutAction}>
          <button className="text-sm font-medium text-neutral-500">Sign out</button>
        </form>
      </header>

      <div className="px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-neutral-900">Trucks ({(trucks ?? []).length})</h1>
          <Link
            href="/admin/trucks/new"
            className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white active:bg-brand-600"
          >
            + New truck
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {(trucks as Truck[] | null)?.map((truck) => (
            <Link
              key={truck.id}
              href={`/admin/trucks/${truck.id}`}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-sm active:bg-neutral-50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate font-semibold text-neutral-900">{truck.name}</h2>
                  {!truck.is_active && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-neutral-500">
                  {truck.cuisine_type.join(", ") || "No cuisine set"}
                </p>
              </div>
              <div className="flex-shrink-0 text-right text-sm text-neutral-500">
                <div>{scansByTruck.get(truck.id) ?? 0} scans</div>
                {truck.short_code && (
                  <div className="font-mono text-xs text-neutral-400">/t/{truck.short_code}</div>
                )}
              </div>
            </Link>
          ))}

          {(trucks ?? []).length === 0 && (
            <p className="py-8 text-center text-sm text-neutral-500">
              No trucks yet. Create your first one.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
