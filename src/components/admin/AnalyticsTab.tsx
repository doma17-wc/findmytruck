"use client";

import { useMemo, useState } from "react";
import { Card, RangeTabs, BarChart, RankedBars, Stat } from "./ui";
import type { AdminAnalyticsData } from "./AdminApp";
import type { AdminTruck, AdminUser } from "./AdminApp";

const DAY = 24 * 60 * 60 * 1000;

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Buckets a {date -> value} map into ~7-8 bars spanning `rangeDays`, labeled
 *  by each bucket's most recent day. Keeps the chart readable at 7/30/90d. */
function bucketSeries(byDate: Map<string, number>, rangeDays: number): { label: string; value: number }[] {
  const bucketSize = Math.max(1, Math.ceil(rangeDays / 8));
  const totalBuckets = Math.ceil(rangeDays / bucketSize);
  const today = new Date();
  const buckets: { label: string; value: number }[] = [];
  for (let b = totalBuckets - 1; b >= 0; b--) {
    let sum = 0;
    let lastDate: Date | null = null;
    for (let i = 0; i < bucketSize; i++) {
      const dayIndex = b * bucketSize + i;
      if (dayIndex >= rangeDays) continue;
      const d = new Date(today.getTime() - dayIndex * DAY);
      sum += byDate.get(dateStr(d)) ?? 0;
      if (!lastDate || d > lastDate) lastDate = d;
    }
    buckets.push({
      label: lastDate ? lastDate.toLocaleDateString("en", { month: "short", day: "numeric" }) : "",
      value: sum,
    });
  }
  return buckets;
}

export default function AnalyticsTab({
  data,
  trucks,
  users,
}: {
  data: AdminAnalyticsData;
  trucks: AdminTruck[];
  users: AdminUser[] | null;
}) {
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const rangeDays = Number(range);

  const stats = useMemo(() => {
    const cutoffDate = dateStr(new Date(Date.now() - (rangeDays - 1) * DAY));
    const cutoffIso = new Date(Date.now() - (rangeDays - 1) * DAY).toISOString();

    const visitsByDate = new Map(data.dailyVisits.map((v) => [v.date, v.count]));
    const visitsInRange = data.dailyVisits
      .filter((v) => v.date >= cutoffDate)
      .reduce((s, v) => s + v.count, 0);

    const viewsByDate = new Map<string, number>();
    const viewsByTruck = new Map<string, number>();
    let viewsInRange = 0;
    for (const v of data.viewEvents) {
      if (v.date < cutoffDate) continue;
      viewsInRange++;
      viewsByDate.set(v.date, (viewsByDate.get(v.date) ?? 0) + 1);
      viewsByTruck.set(v.truck_id, (viewsByTruck.get(v.truck_id) ?? 0) + 1);
    }

    const impressionsByDate = new Map<string, number>();
    let impressionsInRange = 0;
    for (const r of data.impressionEvents) {
      if (r.date < cutoffDate) continue;
      impressionsInRange += r.count;
      impressionsByDate.set(r.date, (impressionsByDate.get(r.date) ?? 0) + r.count);
    }

    const favoritesByDate = new Map<string, number>();
    let followsInRange = 0;
    for (const f of data.favoriteEvents) {
      if (f.date < cutoffDate) continue;
      followsInRange++;
      favoritesByDate.set(f.date, (favoritesByDate.get(f.date) ?? 0) + 1);
    }

    const reviewsInRange = data.reviewEvents.filter((r) => r.date >= cutoffDate).length;

    const cuisineTotals = new Map<string, number>();
    for (const c of data.cuisineEvents) {
      if (c.date < cutoffDate) continue;
      cuisineTotals.set(c.cuisine, (cuisineTotals.get(c.cuisine) ?? 0) + c.count);
    }

    const truckById = new Map(trucks.map((t) => [t.id, t]));
    const topTrucks = [...viewsByTruck.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, value]) => ({ label: truckById.get(id)?.name ?? "Unknown truck", value }));

    const topCuisines = [...cuisineTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        value,
      }));

    // Active vs dormant trucks: "active" = a claimed truck whose owner opened
    // the dashboard within the selected range.
    const ownerLastSeenByTruck = new Map<string, string>();
    for (const r of data.ownerActivity) {
      if (!r.truck_id) continue;
      const cur = ownerLastSeenByTruck.get(r.truck_id);
      if (!cur || r.last_seen_at > cur) ownerLastSeenByTruck.set(r.truck_id, r.last_seen_at);
    }
    const claimedTrucks = trucks.filter((t) => t.claim_status === "claimed");
    const activeTrucks = claimedTrucks.filter(
      (t) => (ownerLastSeenByTruck.get(t.id) ?? "") >= cutoffIso
    );
    const dormantTrucks = claimedTrucks.filter(
      (t) => (ownerLastSeenByTruck.get(t.id) ?? "") < cutoffIso
    );

    // Active customers: signed in within the selected range (auth's own
    // last_sign_in_at -- no separate tracking needed for this one).
    const customers = (users ?? []).filter((u) => u.role !== "truck_owner");
    const activeCustomers = customers.filter(
      (u) => u.last_sign_in_at && u.last_sign_in_at >= cutoffIso
    ).length;

    return {
      visitsInRange,
      viewsInRange,
      impressionsInRange,
      followsInRange,
      reviewsInRange,
      conversion: impressionsInRange > 0 ? Math.round((viewsInRange / impressionsInRange) * 1000) / 10 : 0,
      avgTrucksPerVisit: visitsInRange > 0 ? Math.round((viewsInRange / visitsInRange) * 10) / 10 : 0,
      topTrucks,
      topCuisines,
      activeTrucksCount: activeTrucks.length,
      dormantTrucks,
      customersTotal: customers.length,
      activeCustomers,
      visitsSeries: bucketSeries(visitsByDate, rangeDays),
      viewsSeries: bucketSeries(viewsByDate, rangeDays),
      impressionsSeries: bucketSeries(impressionsByDate, rangeDays),
      favoritesSeries: bucketSeries(favoritesByDate, rangeDays),
    };
  }, [data, trucks, users, rangeDays]);

  const totalScans = trucks.reduce((s, t) => s + t.scans, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">Platform analytics</h2>
          <p className="text-sm text-muted">How FindMyTruck is actually being used</p>
        </div>
        <RangeTabs
          value={range}
          onChange={setRange}
          options={[
            { value: "7", label: "7d" },
            { value: "30", label: "30d" },
            { value: "90", label: "90d" },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Visitor sessions" value={stats.visitsInRange} sub={`${range}d`} />
        <Stat label="Profile views" value={stats.viewsInRange} sub={`~${stats.avgTrucksPerVisit} trucks / session`} />
        <Stat
          label="Impressions"
          value={stats.impressionsInRange}
          sub={stats.impressionsInRange > 0 ? `${stats.conversion}% conversion` : undefined}
        />
        <Stat
          label="Active customers"
          value={stats.activeCustomers}
          sub={`of ${stats.customersTotal} total`}
          tone="blue"
        />
        <Stat
          label="Active trucks"
          value={stats.activeTrucksCount}
          sub={`${stats.dormantTrucks.length} dormant`}
          tone={stats.dormantTrucks.length > 0 ? "amber" : "green"}
        />
        <Stat label="QR scans" value={totalScans} sub="all-time" />
        <Stat label="New follows" value={stats.followsInRange} sub={`${range}d`} />
        <Stat label="New reviews" value={stats.reviewsInRange} sub={`${range}d`} />
      </div>

      <Card className="p-5">
        <h3 className="font-display text-base font-bold text-ink">Visitor sessions</h3>
        <p className="text-sm text-muted">Aggregate, no identifiers -- one tick per browser per day</p>
        <div className="mt-4">
          <BarChart data={stats.visitsSeries} accent="#FF5A3C" />
        </div>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-display text-base font-bold text-ink">Impressions</h3>
          <div className="mt-4">
            <BarChart data={stats.impressionsSeries} accent="#9333EA" />
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-display text-base font-bold text-ink">Profile views</h3>
          <div className="mt-4">
            <BarChart data={stats.viewsSeries} accent="#2563EB" />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-display text-base font-bold text-ink">Top trucks</h3>
          <p className="text-sm text-muted">By profile views, {range}d</p>
          <div className="mt-4">
            <RankedBars data={stats.topTrucks} accent="#FF5A3C" />
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-display text-base font-bold text-ink">Top cuisines searched</h3>
          <p className="text-sm text-muted">By filter usage, {range}d</p>
          <div className="mt-4">
            <RankedBars data={stats.topCuisines} accent="#16A34A" />
          </div>
        </Card>
      </div>

      {stats.dormantTrucks.length > 0 && (
        <Card className="p-5">
          <h3 className="font-display text-base font-bold text-ink">Dormant trucks</h3>
          <p className="text-sm text-muted">
            Claimed, but the owner hasn&apos;t opened their dashboard in {range} days -- worth a nudge
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {stats.dormantTrucks.slice(0, 12).map((t) => (
              <span
                key={t.id}
                className="rounded-full bg-amber/10 px-3 py-1 text-xs font-bold text-amber"
              >
                {t.name}
              </span>
            ))}
            {stats.dormantTrucks.length > 12 && (
              <span className="rounded-full bg-paper-deep px-3 py-1 text-xs font-bold text-muted">
                +{stats.dormantTrucks.length - 12} more
              </span>
            )}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="font-display text-base font-bold text-ink">New follows</h3>
        <div className="mt-4">
          <BarChart data={stats.favoritesSeries} accent="#0891B2" />
        </div>
      </Card>
    </div>
  );
}
