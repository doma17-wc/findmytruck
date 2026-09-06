"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AdminUser } from "./AdminApp";
import { deleteUserAction, adminUnlinkOneTruckAction } from "@/app/admin/actions";
import { cn, Card, Badge, ActionButton } from "./ui";

type RoleFilter = "all" | "customer" | "truck_owner";

export default function UsersTab({
  users,
  hasServiceRole,
}: {
  users: AdminUser[] | null;
  hasServiceRole: boolean;
}) {
  const [role, setRole] = useState<RoleFilter>("all");
  const [q, setQ] = useState("");

  const visible = useMemo(() => {
    if (!users) return [];
    const needle = q.trim().toLowerCase();
    return users.filter((u) => {
      const r = u.role === "truck_owner" ? "truck_owner" : "customer";
      if (role !== "all" && r !== role) return false;
      if (needle) {
        const hay = `${u.email ?? ""} ${u.display_name ?? ""} ${u.trucks
          .map((t) => t.name)
          .join(" ")}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [users, role, q]);

  if (!hasServiceRole || !users) {
    return (
      <Card className="p-5">
        <h1 className="font-display text-lg font-extrabold text-ink">User management is off</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Listing and deleting registered accounts needs the Supabase{" "}
          <span className="font-mono text-xs">service_role</span> key. Add{" "}
          <span className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</span> to the project
          environment (Vercel → Settings → Environment Variables → all environments), redeploy, and
          this tab will populate. No other part of the admin panel needs it.
        </p>
      </Card>
    );
  }

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-CH", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-extrabold text-ink">
        Users <span className="text-muted">({visible.length})</span>
      </h1>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search email, name, truck…"
        className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[15px] outline-none focus:border-accent"
      />

      <div className="flex flex-wrap gap-2">
        {(["all", "customer", "truck_owner"] as RoleFilter[]).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-bold transition",
              role === r
                ? "border-ink bg-ink text-white"
                : "border-line bg-card text-ink-soft hover:border-accent/40"
            )}
          >
            {r === "all" ? "All" : r === "customer" ? "Customers" : "Truck owners"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map((u) => (
          <Card key={u.id} className="p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-ink">{u.email ?? "(no email)"}</span>
              {u.role === "truck_owner" ? (
                <Badge tone="blue">Truck owner</Badge>
              ) : (
                <Badge>Customer</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">
              {u.display_name ? u.display_name : "No display name"}
            </p>

            {u.trucks.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {u.trucks.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <Link
                      href={`/admin/trucks/${t.id}`}
                      className="font-medium text-blue hover:underline"
                    >
                      {t.name}
                    </Link>
                    {t.claim_status === "pending" && <Badge tone="amber">Pending</Badge>}
                    {t.claim_status === "claimed" && <Badge tone="blue">Claimed</Badge>}
                    <ActionButton
                      onRun={() => adminUnlinkOneTruckAction(u.id, t.id)}
                      confirm={`Unassign "${t.name}" from ${u.email ?? "this account"}? Their other trucks are unaffected.`}
                      className="ml-auto bg-paper-deep text-ink-soft hover:bg-line"
                    >
                      Unassign
                    </ActionButton>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-muted">No trucks linked</p>
            )}

            <p className="mt-2 text-xs text-muted">
              Joined {fmt(u.created_at)} · last sign-in {fmt(u.last_sign_in_at)}
            </p>

            <div className="mt-3">
              <ActionButton
                onRun={() => deleteUserAction(u.id)}
                confirm={`Delete the account ${u.email ?? u.id}? This frees up the email for re-registration${
                  u.trucks.length > 0
                    ? ` and resets ${u.trucks.length === 1 ? "their truck" : `all ${u.trucks.length} of their trucks`} to "unclaimed"`
                    : ""
                }. This cannot be undone.`}
                className="bg-accent/10 text-accent-dark hover:bg-accent/20"
              >
                Delete account
              </ActionButton>
            </div>
          </Card>
        ))}
        {visible.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">No users match.</p>
        )}
      </div>
    </div>
  );
}
