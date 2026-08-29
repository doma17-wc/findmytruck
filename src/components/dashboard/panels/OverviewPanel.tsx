"use client";

import { Eye, Users, UtensilsCrossed, Radio, ArrowRight } from "lucide-react";
import type { Truck, TruckSchedule } from "@/lib/types";
import { Card, CardBody, BarChart } from "../ui";
import LiveHero from "../LiveHero";
import type { DashboardStats } from "../DashboardApp";

interface Props {
  truck: Truck;
  liveRow: TruckSchedule | null;
  stats: DashboardStats;
  onNavigate: (key: "golive" | "menu" | "schedule" | "reviews" | "insights" | "settings") => void;
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

export default function OverviewPanel({ truck, liveRow, stats, onNavigate }: Props) {
  const live = Boolean(liveRow);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Eye} label="Views today" value={stats.viewsToday} />
        <Kpi icon={Users} label="Followers" value={stats.followers} />
        <Kpi icon={UtensilsCrossed} label="Menu items" value={stats.menuItemCount} />
        <Kpi
          icon={Radio}
          label="Live status"
          value={live ? "Live" : truck.is_active ? "Listed" : "Off"}
        />
      </div>

      <LiveHero live={live} liveRow={liveRow}>
        <button
          type="button"
          onClick={() => onNavigate("golive")}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-white/90"
        >
          {live ? "Manage service" : "Go live now"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </LiveHero>

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
