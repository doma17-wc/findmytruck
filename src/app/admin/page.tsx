import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Truck, QrRedirect, ClaimStatus } from "@/lib/types";
import { logoutAction, approveClaimAction } from "./actions";

export const dynamic = "force-dynamic";

const CLAIM_FILTERS: { key: "all" | ClaimStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unclaimed", label: "Unclaimed" },
  { key: "pending", label: "Pending" },
  { key: "claimed", label: "Claimed" },
];

const CLAIM_BADGE: Record<ClaimStatus, string> = {
  unclaimed: "bg-neutral-100 text-neutral-500",
  pending: "bg-amber-100 text-amber-700",
  claimed: "bg-green-100 text-green-700",
};

function claimStatusOf(truck: Truck): ClaimStatus {
  return (truck.claim_status as ClaimStatus | null) ?? (truck.is_claimed ? "claimed" : "unclaimed");
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: { claim?: string };
}) {
  const [{ data: trucks }, { data: redirects }] = await Promise.all([
    supabase.from("trucks").select("*").order("created_at", { ascending: false }),
    supabase.from("qr_redirects").select("*"),
  ]);

  const scansByTruck = new Map<string, number>();
  ((redirects ?? []) as QrRedirect[]).forEach((r) => {
    if (!r.truck_id) return;
    scansByTruck.set(r.truck_id, (scansByTruck.get(r.truck_id) ?? 0) + r.scan_count);
  });

  const allTrucks = (trucks ?? []) as Truck[];
  const counts = { unclaimed: 0, pending: 0, claimed: 0 };
  allTrucks.forEach((t) => {
    counts[claimStatusOf(t)] += 1;
  });

  const activeFilter = CLAIM_FILTERS.some((f) => f.key === searchParams.claim)
    ? (searchParams.claim as "all" | ClaimStatus)
    : "all";
  const visibleTrucks =
    activeFilter === "all"
      ? allTrucks
      : allTrucks.filter((t) => claimStatusOf(t) === activeFilter);

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
          <h1 className="text-xl font-bold text-neutral-900">Trucks ({allTrucks.length})</h1>
          <Link
            href="/admin/trucks/new"
            className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white active:bg-brand-600"
          >
            + New truck
          </Link>
        </div>

        <p className="mt-2 text-sm text-neutral-500">
          <span className="font-semibold text-neutral-700">{counts.unclaimed}</span> unclaimed ·{" "}
          <span className="font-semibold text-amber-700">{counts.pending}</span> pending ·{" "}
          <span className="font-semibold text-green-700">{counts.claimed}</span> claimed
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {CLAIM_FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/admin" : `/admin?claim=${f.key}`}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                activeFilter === f.key
                  ? "border-brand bg-brand text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {visibleTrucks.map((truck) => {
            const status = claimStatusOf(truck);
            return (
              <div
                key={truck.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/admin/trucks/${truck.id}`} className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-semibold text-neutral-900">{truck.name}</h2>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CLAIM_BADGE[status]}`}
                      >
                        {status}
                      </span>
                      {!truck.is_active && (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-neutral-500">
                      {truck.cuisine_type.join(", ") || "No cuisine set"}
                      {truck.source_region ? ` · ${truck.source_region}` : ""}
                    </p>
                  </Link>
                  <div className="flex-shrink-0 text-right text-sm text-neutral-500">
                    <div>{scansByTruck.get(truck.id) ?? 0} scans</div>
                    {truck.short_code && (
                      <div className="font-mono text-xs text-neutral-400">/t/{truck.short_code}</div>
                    )}
                  </div>
                </div>

                {status === "pending" && (
                  <form action={approveClaimAction.bind(null, truck.id)} className="mt-3">
                    <button className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white active:bg-green-700">
                      Approve claim
                    </button>
                  </form>
                )}
              </div>
            );
          })}

          {visibleTrucks.length === 0 && (
            <p className="py-8 text-center text-sm text-neutral-500">No trucks in this view.</p>
          )}
        </div>
      </div>
    </div>
  );
}
