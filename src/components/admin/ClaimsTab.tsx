"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AdminTruck } from "./AdminApp";
import {
  approveClaimAction,
  setClaimStatusAction,
  assignOwnerByEmailAction,
  unassignOwnerAction,
} from "@/app/admin/actions";
import { cn, Card, Badge, ActionButton, InlineForm } from "./ui";

type Filter = "pending" | "unclaimed" | "claimed" | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "unclaimed", label: "Unclaimed" },
  { key: "claimed", label: "Claimed" },
  { key: "all", label: "All" },
];

export default function ClaimsTab({
  trucks,
  hasServiceRole,
}: {
  trucks: AdminTruck[];
  hasServiceRole: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("pending");

  const visible = useMemo(() => {
    const list =
      filter === "all"
        ? trucks
        : trucks.filter((t) => (t.claim_status ?? "unclaimed") === filter);
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [trucks, filter]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-extrabold text-ink">
        Claims <span className="text-muted">({visible.length})</span>
      </h1>

      {!hasServiceRole && (
        <Card className="p-4">
          <p className="text-sm text-ink-soft">
            Approving a pending claim works now. Assigning / unassigning an owner account by email
            needs <span className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</span> in the
            environment.
          </p>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-bold transition",
              filter === f.key
                ? "border-ink bg-ink text-white"
                : "border-line bg-card text-ink-soft hover:border-accent/40"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map((t) => {
          const cs = t.claim_status ?? "unclaimed";
          return (
            <Card key={t.id} className="p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  href={`/admin/trucks/${t.id}`}
                  className="font-display font-bold text-ink hover:text-accent"
                >
                  {t.name}
                </Link>
                {cs === "pending" && <Badge tone="amber">Pending</Badge>}
                {cs === "claimed" && <Badge tone="blue">Claimed</Badge>}
                {cs === "unclaimed" && <Badge>Unclaimed</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted">
                {t.owner_name || t.owner_email || t.source_website || "No owner contact on file"}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {cs === "pending" && (
                  <ActionButton
                    onRun={() => approveClaimAction(t.id)}
                    className="bg-live/10 text-live hover:bg-live/20"
                  >
                    Approve claim
                  </ActionButton>
                )}
                {cs !== "unclaimed" && (
                  <ActionButton
                    onRun={() => setClaimStatusAction(t.id, "unclaimed")}
                    confirm={`Reset "${t.name}" to unclaimed?`}
                    className="bg-paper-deep text-ink-soft hover:bg-line"
                  >
                    Reset to unclaimed
                  </ActionButton>
                )}
                {cs === "claimed" && hasServiceRole && (
                  <ActionButton
                    onRun={() => unassignOwnerAction(t.id)}
                    confirm={`Unlink the owner account from "${t.name}"?`}
                    className="bg-accent/10 text-accent-dark hover:bg-accent/20"
                  >
                    Unassign owner
                  </ActionButton>
                )}
              </div>

              {hasServiceRole && (
                <div className="mt-3">
                  <span className="mb-1 block text-xs font-bold text-muted">
                    Assign owner by account email
                  </span>
                  <InlineForm
                    type="email"
                    placeholder="owner@example.com"
                    buttonLabel="Assign"
                    onSubmit={(email) => assignOwnerByEmailAction(t.id, email)}
                  />
                </div>
              )}
            </Card>
          );
        })}
        {visible.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">Nothing here.</p>
        )}
      </div>
    </div>
  );
}
