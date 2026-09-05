"use client";

import { Eye, Users, UtensilsCrossed, Zap, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import type { Truck } from "@/lib/types";
import { Card, CardBody, BarChart } from "../ui";
import BoostHero from "../BoostHero";
import type { DashboardStats } from "../DashboardApp";

interface Props {
  truck: Truck;
  boosted: boolean;
  boostExpiresAt: string | null;
  boostStartedAt: string | null;
  stats: DashboardStats;
  onNavigate: (key: "boost" | "menu" | "schedule" | "reviews" | "insights" | "settings") => void;
}

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Eye;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardBody className="p-4">
        <div className="flex items-center gap-2 text-muted">
          <Icon className="h-4 w-4" />
          <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
        </div>
        <p className="mt-2 font-display text-3xl font-extrabold text-ink">{value}</p>
      </CardBody>
    </Card>
  );
}

function ReachCard({ stats }: { stats: DashboardStats }) {
  const conversion =
    stats.impressions7 > 0 ? Math.round((stats.views7 / stats.impressions7) * 1000) / 10 : 0;
  const trend =
    stats.impressionsPrev7 > 0
      ? Math.round(((stats.impressions7 - stats.impressionsPrev7) / stats.impressionsPrev7) * 100)
      : null;

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold text-ink">Reach &amp; conversion</h2>
          {trend !== null && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-bold ${
                trend >= 0 ? "text-green-600" : "text-muted"
              }`}
            >
              {trend >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {trend >= 0 ? "+" : ""}
              {trend}% vs last week
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Impressions today
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold text-ink">
              {stats.impressionsToday}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Impressions (7d)
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold text-ink">
              {stats.impressions7}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Conversion
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold text-accent">
              {conversion}%
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted">
          {stats.impressions7 === 0
            ? "Once your truck starts showing up in searches, you'll see how many people notice it here."
            : `${conversion}% of people who saw your truck opened your profile. A higher rate means your photo & name attract clicks.`}
        </p>
      </CardBody>
    </Card>
  );
}

export default function OverviewPanel({
  truck,
  boosted,
  boostExpiresAt,
  boostStartedAt,
  stats,
  onNavigate,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi icon={Eye} label="Impressions today" value={stats.impressionsToday} />
        <Kpi icon={Eye} label="Views today" value={stats.viewsToday} />
        <Kpi icon={Users} label="Followers" value={stats.followers} />
        <Kpi icon={UtensilsCrossed} label="Menu items" value={stats.menuItemCount} />
        <Kpi
          icon={Zap}
          label="Status"
          value={boosted ? "Boosted" : truck.is_active ? "Listed" : "Off"}
        />
      </div>

      <BoostHero boosted={boosted} startedAt={boostStartedAt} expiresAt={boostExpiresAt}>
        <button
          type="button"
          onClick={() => onNavigate("boost")}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-white/90"
        >
          {boosted ? "Manage boost" : "Boost now"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </BoostHero>

      <ReachCard stats={stats} />

      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-ink">Views this week</h2>
            <span className="font-mono text-sm text-muted">{stats.views7} total</span>
          </div>
          <div className="mt-4">
            <BarChart data={stats.weeklyViews} />
          </div>
        </CardBody>
      </Card>

      <button
        type="button"
        onClick={() => onNavigate("reviews")}
        className="flex w-full items-center justify-between rounded-2xl border border-line bg-card px-5 py-4 text-left shadow-paper transition hover:border-accent/40"
      >
        <div>
          <p className="font-display text-base font-bold text-ink">
            {stats.reviewCount > 0
              ? `${stats.avgRating}★ · ${stats.reviewCount} review${stats.reviewCount === 1 ? "" : "s"}`
              : "No reviews yet"}
          </p>
          <p className="text-sm text-muted">Read and reply to customer feedback</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted" />
      </button>
    </div>
  );
}
