"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Truck, EventWithTrucks } from "@/lib/types";
import { logoutAction } from "@/app/admin/actions";
import { cn, Card, Badge } from "./ui";
import TrucksTab from "./TrucksTab";
import ClaimsTab from "./ClaimsTab";
import UsersTab from "./UsersTab";
import AdminEventsTab from "./AdminEventsTab";

export interface AdminTruck extends Truck {
  scans: number;
  reviewCount: number;
  impressions30: number;
  views30: number;
  boostedNow: boolean;
}

export interface AdminUser {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  role: "customer" | "truck_owner" | null;
  truck_id: string | null;
  truck_name: string | null;
  display_name: string | null;
}

type Tab = "overview" | "trucks" | "claims" | "events" | "users";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "trucks", label: "Trucks" },
  { key: "claims", label: "Claims" },
  { key: "events", label: "Events" },
  { key: "users", label: "Users" },
];

export default function AdminApp({
  trucks,
  users,
  events,
  hasServiceRole,
}: {
  trucks: AdminTruck[];
  users: AdminUser[] | null;
  events: EventWithTrucks[];
  hasServiceRole: boolean;
}) {
  const [tab, setTab] = useState<Tab>("overview");

  const stats = useMemo(() => {
    const s = {
      total: trucks.length,
      unclaimed: 0,
      pending: 0,
      claimed: 0,
      paused: 0,
      boostedNow: 0,
      inactive: 0,
      scans: 0,
      impressions30: 0,
      views30: 0,
      customers: 0,
      owners: 0,
    };
    for (const t of trucks) {
      const cs = t.claim_status ?? "unclaimed";
      if (cs === "unclaimed") s.unclaimed++;
      else if (cs === "pending") s.pending++;
      else if (cs === "claimed") s.claimed++;
      if (t.paused) s.paused++;
      if (t.boostedNow) s.boostedNow++;
      if (!t.is_active) s.inactive++;
      s.scans += t.scans;
      s.impressions30 += t.impressions30;
      s.views30 += t.views30;
    }
    if (users) {
      s.customers = users.filter((u) => u.role !== "truck_owner").length;
      s.owners = users.filter((u) => u.role === "truck_owner").length;
    }
    return s;
  }, [trucks, users]);

  return (
    <div className="pb-16">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚚</span>
          <span className="font-display text-lg font-extrabold text-ink">
            FindMyTruck <span className="text-accent">Admin</span>
          </span>
        </div>
        <form action={logoutAction}>
          <button className="text-sm font-semibold text-muted hover:text-ink">Sign out</button>
        </form>
      </header>

      <nav className="sticky top-[57px] z-10 flex gap-1 overflow-x-auto border-b border-line bg-paper px-3 py-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition",
              tab === t.key ? "bg-ink text-white" : "text-ink-soft hover:bg-paper-deep"
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-6">
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Trucks" value={stats.total} />
              <Stat label="Boosted now" value={stats.boostedNow} tone="green" />
              <Stat label="Paused" value={stats.paused} tone={stats.paused ? "amber" : "neutral"} />
              <Stat label="Unclaimed" value={stats.unclaimed} />
              <Stat label="Pending claims" value={stats.pending} tone={stats.pending ? "amber" : "neutral"} />
              <Stat label="Claimed" value={stats.claimed} tone="blue" />
              <Stat label="Inactive" value={stats.inactive} />
              <Stat label="Total QR scans" value={stats.scans} />
              <Stat
                label="Impressions (30d)"
                value={stats.impressions30}
                sub={
                  stats.impressions30 > 0
                    ? `${Math.round((stats.views30 / stats.impressions30) * 1000) / 10}% conversion`
                    : undefined
                }
              />
              <Stat
                label="Users"
                value={users ? users.length : "—"}
                sub={users ? `${stats.customers} customers · ${stats.owners} owners` : "service key off"}
              />
            </div>

            <Card className="p-5">
              <h2 className="font-display text-base font-bold text-ink">Quick actions</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/admin/trucks/new"
                  className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-dark"
                >
                  + New truck
                </Link>
                <button
                  onClick={() => setTab("claims")}
                  className="rounded-full border border-line bg-card px-4 py-2 text-sm font-bold text-ink-soft hover:border-accent/40"
                >
                  Review {stats.pending} pending claim{stats.pending === 1 ? "" : "s"}
                </button>
              </div>
            </Card>

            {!hasServiceRole && (
              <Card className="p-5">
                <h2 className="font-display text-base font-bold text-ink">
                  Enable user management
                </h2>
                <p className="mt-1.5 text-sm text-ink-soft">
                  Listing / deleting user accounts and assigning owners by email need the Supabase{" "}
                  <span className="font-mono text-xs">service_role</span> key. Add{" "}
                  <span className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</span> to the project
                  environment (Vercel → Settings → Environment Variables, all environments) and
                  redeploy. Everything else already works.
                </p>
              </Card>
            )}
          </div>
        )}

        {tab === "trucks" && <TrucksTab trucks={trucks} />}
        {tab === "claims" && <ClaimsTab trucks={trucks} hasServiceRole={hasServiceRole} />}
        {tab === "events" && (
          <AdminEventsTab
            events={events}
            trucks={trucks.map((t) => ({ id: t.id, name: t.name }))}
          />
        )}
        {tab === "users" && <UsersTab users={users} hasServiceRole={hasServiceRole} />}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: "neutral" | "green" | "amber" | "blue";
}) {
  const ring =
    tone === "green"
      ? "text-live"
      : tone === "amber"
      ? "text-amber"
      : tone === "blue"
      ? "text-blue"
      : "text-ink";
  return (
    <Card className="p-4">
      <div className={cn("font-display text-2xl font-extrabold", ring)}>{value}</div>
      <div className="mt-0.5 text-xs font-semibold text-muted">{label}</div>
      {sub && <div className="mt-1 text-[11px] text-muted">{sub}</div>}
    </Card>
  );
}

export { Badge };
