"use client";

import { MapPin } from "lucide-react";
import { Card, CardBody, BarChart } from "../ui";
import type { DashboardStats } from "../DashboardApp";

export default function InsightsPanel({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <h2 className="font-display text-base font-bold text-ink">Impressions this week</h2>
          <p className="text-sm text-muted">
            How many times your card was shown across the map, list, and browse grid
          </p>
          <div className="mt-4">
            <BarChart data={stats.weeklyImpressions} accent="#9333EA" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-display text-base font-bold text-ink">Best days</h2>
          <p className="text-sm text-muted">Average profile views by weekday (last 90 days)</p>
          <div className="mt-4">
            <BarChart data={stats.byWeekday} accent="#2563EB" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-display text-base font-bold text-ink">Follower growth</h2>
          <p className="text-sm text-muted">Total followers at the end of each week</p>
          <div className="mt-4">
            <BarChart data={stats.followerGrowth} accent="#16A34A" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-display text-base font-bold text-ink">Best pitches</h2>
          <p className="text-sm text-muted">Views by location</p>
          <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-line py-10 text-center">
            <MapPin className="h-7 w-7 text-line" />
            <p className="mt-2 text-sm font-medium text-muted">
              Location-level view data isn&apos;t available yet.
            </p>
            <p className="text-xs text-muted">
              Keep going live from different pitches to build this up.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
