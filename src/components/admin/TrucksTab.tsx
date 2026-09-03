"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AdminTruck } from "./AdminApp";
import {
  pauseTruckAction,
  setBoostOverrideAction,
  setClaimStatusAction,
  deleteTruckAction,
} from "@/app/admin/actions";
import { cn, Card, Badge, ActionButton } from "./ui";

type StatusFilter =
  | "all"
  | "unclaimed"
  | "pending"
  | "claimed"
  | "paused"
  | "boosted"
  | "inactive";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unclaimed", label: "Unclaimed" },
  { key: "pending", label: "Pending" },
  { key: "claimed", label: "Claimed" },
  { key: "paused", label: "Paused" },
  { key: "boosted", label: "Boosted now" },
  { key: "inactive", label: "Inactive" },
];

export default function TrucksTab({ trucks }: { trucks: AdminTruck[] }) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [region, setRegion] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [q, setQ] = useState("");

  const regions = useMemo(
    () => Array.from(new Set(trucks.map((t) => t.source_region).filter(Boolean))).sort() as string[],
    [trucks]
  );
  const cuisines = useMemo(
    () => Array.from(new Set(trucks.flatMap((t) => t.cuisine_type ?? []))).sort(),
    [trucks]
  );

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return trucks.filter((t) => {
      const cs = t.claim_status ?? "unclaimed";
      if (status === "paused" && !t.paused) return false;
      if (status === "boosted" && !t.boostedNow) return false;
      if (status === "inactive" && t.is_active) return false;
      if (
        (status === "unclaimed" || status === "pending" || status === "claimed") &&
        cs !== status
      )
        return false;
      if (region && t.source_region !== region) return false;
      if (cuisine && !(t.cuisine_type ?? []).includes(cuisine)) return false;
      if (needle) {
        const hay = `${t.name} ${t.owner_name ?? ""} ${t.owner_email ?? ""} ${t.slug}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [trucks, status, region, cuisine, q]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-extrabold text-ink">
          Trucks <span className="text-muted">({visible.length})</span>
        </h1>
        <Link
          href="/admin/trucks/new"
          className="flex-shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-dark"
        >
          + New truck
        </Link>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, owner, email…"
        className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[15px] outline-none focus:border-accent"
      />

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatus(f.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-bold transition",
              status === f.key
                ? "border-ink bg-ink text-white"
                : "border-line bg-card text-ink-soft hover:border-accent/40"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {(regions.length > 0 || cuisines.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {regions.length > 0 && (
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="rounded-lg border border-line bg-card px-3 py-1.5 text-sm outline-none focus:border-accent"
            >
              <option value="">All regions</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}
          {cuisines.length > 0 && (
            <select
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              className="rounded-lg border border-line bg-card px-3 py-1.5 text-sm outline-none focus:border-accent"
            >
              <option value="">All cuisines</option>
              {cuisines.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="space-y-3">
        {visible.map((t) => (
          <TruckRow key={t.id} t={t} />
        ))}
        {visible.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">No trucks match these filters.</p>
        )}
      </div>
    </div>
  );
}

function TruckRow({ t }: { t: AdminTruck }) {
  const cs = t.claim_status ?? "unclaimed";
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/admin/trucks/${t.id}`}
              className="font-display font-bold text-ink hover:text-accent"
            >
              {t.name}
            </Link>
            {t.paused && <Badge tone="amber">Paused</Badge>}
            {t.boostedNow && <Badge tone="green">Boosted</Badge>}
            {cs === "pending" && <Badge tone="amber">Pending</Badge>}
            {cs === "claimed" && <Badge tone="blue">Claimed</Badge>}
            {cs === "unclaimed" && <Badge>Unclaimed</Badge>}
            {!t.is_active && <Badge>Inactive</Badge>}
          </div>
          <p className="mt-1 truncate text-sm text-muted">
            {(t.cuisine_type ?? []).join(", ") || "No cuisine"}
            {t.source_region ? ` · ${t.source_region}` : ""}
            {t.owner_email ? ` · ${t.owner_email}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {t.scans} scans · {t.reviewCount} reviews · <span className="font-mono">/{t.slug}</span>
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          href={`/admin/trucks/${t.id}`}
          className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-bold text-ink-soft transition hover:border-accent/40"
        >
          Edit
        </Link>

        <ActionButton
          onRun={() => pauseTruckAction(t.id, !t.paused)}
          confirm={t.paused ? undefined : `Pause "${t.name}"? It will be hidden from the public site.`}
          className={
            t.paused
              ? "bg-live/10 text-live hover:bg-live/20"
              : "bg-amber/10 text-amber hover:bg-amber/20"
          }
        >
          {t.paused ? "Unpause" : "Pause"}
        </ActionButton>

        <ActionButton
          onRun={() => setBoostOverrideAction(t.id, !t.boostedNow)}
          className={
            t.boostedNow
              ? "bg-paper-deep text-ink-soft hover:bg-line"
              : "bg-live/10 text-live hover:bg-live/20"
          }
        >
          {t.boostedNow ? "End boost" : "Boost 4h"}
        </ActionButton>

        <select
          defaultValue={cs}
          onChange={(e) =>
            setClaimStatusAction(
              t.id,
              e.target.value as "unclaimed" | "pending" | "claimed"
            )
          }
          className="rounded-lg border border-line bg-card px-2 py-1.5 text-xs font-bold text-ink-soft outline-none focus:border-accent"
          aria-label="Claim status"
        >
          <option value="unclaimed">Unclaimed</option>
          <option value="pending">Pending</option>
          <option value="claimed">Claimed</option>
        </select>

        <ActionButton
          onRun={() => deleteTruckAction(t.id)}
          confirm={`Delete "${t.name}" permanently? This cannot be undone.`}
          className="ml-auto bg-accent/10 text-accent-dark hover:bg-accent/20"
        >
          Delete
        </ActionButton>
      </div>
    </Card>
  );
}
