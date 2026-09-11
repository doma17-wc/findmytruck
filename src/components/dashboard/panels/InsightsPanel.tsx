"use client";

import { useState } from "react";
import { QrCode, UtensilsCrossed, Camera } from "lucide-react";
import { Card, CardBody, BarChart, RankedBars, SegmentedControl } from "../ui";
import type { DashboardStats } from "../DashboardApp";

export default function InsightsPanel({ stats }: { stats: DashboardStats }) {
  const [range, setRange] = useState<"7d" | "30d">("7d");

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-ink">Views &amp; impressions</h2>
              <p className="text-sm text-muted">
                How many times your card was shown, and how many turned into a profile open
              </p>
            </div>
            <SegmentedControl
              ariaLabel="Time range"
              value={range}
              onChange={setRange}
              options={[
                { value: "7d", label: "7d" },
                { value: "30d", label: "30d" },
              ]}
            />
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted">
                Impressions
              </p>
              <BarChart
                data={range === "7d" ? stats.weeklyImpressions : stats.monthlyImpressionsByWeek}
                accent="#9333EA"
              />
            </div>
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted">
                Profile views
              </p>
              <BarChart
                data={range === "7d" ? stats.weeklyViews : stats.monthlyViewsByWeek}
                accent="#FF5A3C"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
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
            <h2 className="font-display text-base font-bold text-ink">Best times</h2>
            <p className="text-sm text-muted">When profile views happen (last 90 days)</p>
            <div className="mt-4">
              <BarChart data={stats.byHour} accent="#0891B2" height={150} />
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <h2 className="font-display text-base font-bold text-ink">Where views come from</h2>
          <p className="text-sm text-muted">Last 30 days</p>
          <div className="mt-4">
            <RankedBars data={stats.viewSources} accent="#FF5A3C" />
          </div>
          {stats.qrScans > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-paper-deep px-3 py-2 text-xs font-semibold text-ink-soft">
              <QrCode className="h-3.5 w-3.5 flex-shrink-0" />
              {stats.qrScans} all-time QR code scan{stats.qrScans === 1 ? "" : "s"}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-display text-base font-bold text-ink">What people look at</h2>
          <p className="text-sm text-muted">Last 30 days</p>

          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                <UtensilsCrossed className="h-3.5 w-3.5" /> Menu items opened
              </p>
              <RankedBars data={stats.topMenuItems} accent="#16A34A" emptyLabel="No dish photos opened yet" />
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                <Camera className="h-3.5 w-3.5" /> Photos opened
              </p>
              <RankedBars data={stats.topPhotos} accent="#2563EB" emptyLabel="No gallery photos opened yet" />
            </div>
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
    </div>
  );
}
