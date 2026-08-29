"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  Radio,
  UtensilsCrossed,
  CalendarDays,
  Star,
  BarChart3,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  X,
  ExternalLink,
} from "lucide-react";
import type { Truck, TruckSchedule, TruckPhoto, Review } from "@/lib/types";
import { ToastProvider, Beacon, cn } from "./ui";
import OverviewPanel from "./panels/OverviewPanel";
import GoLivePanel from "./panels/GoLivePanel";
import MenuPanel from "./panels/MenuPanel";
import SchedulePanel from "./panels/SchedulePanel";
import ReviewsPanel from "./panels/ReviewsPanel";
import InsightsPanel from "./panels/InsightsPanel";
import SettingsPanel from "./panels/SettingsPanel";

export interface DashboardStats {
  viewsToday: number;
  views7: number;
  followers: number;
  menuItemCount: number;
  reviewCount: number;
  avgRating: number;
  weeklyViews: { label: string; value: number }[];
  byWeekday: { label: string; value: number }[];
  followerGrowth: { label: string; value: number }[];
}

interface Props {
  truck: Truck;
  schedules: TruckSchedule[];
  photos: TruckPhoto[];
  reviews: Review[];
  liveRow: TruckSchedule | null;
  stats: DashboardStats;
  ownerName: string | null;
}

type PanelKey =
  | "overview"
  | "golive"
  | "menu"
  | "schedule"
  | "reviews"
  | "insights"
  | "settings";

const NAV: { key: PanelKey; label: string; icon: typeof LayoutGrid }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "golive", label: "Go Live", icon: Radio },
  { key: "menu", label: "Menu", icon: UtensilsCrossed },
  { key: "schedule", label: "Tour schedule", icon: CalendarDays },
  { key: "reviews", label: "Reviews", icon: Star },
  { key: "insights", label: "Insights", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

const HEADINGS: Record<PanelKey, { title: string; subtitle: string }> = {
  overview: { title: "Overview", subtitle: "How your truck is doing today" },
  golive: { title: "Go Live", subtitle: "Tell everyone where you're parked right now" },
  menu: { title: "Menu", subtitle: "Prices update on your public profile instantly" },
  schedule: { title: "Tour schedule", subtitle: "Your regular weekly stops" },
  reviews: { title: "Reviews", subtitle: "What customers are saying" },
  insights: { title: "Insights", subtitle: "Trends across your pitches and week" },
  settings: { title: "Settings", subtitle: "Profile, payment, photos" },
};

export default function DashboardApp(props: Props) {
  const { truck, liveRow } = props;
  const [active, setActive] = useState<PanelKey>("overview");
  const [drawer, setDrawer] = useState(false);
  const live = Boolean(liveRow);

  const go = (key: PanelKey) => {
    setActive(key);
    setDrawer(false);
  };

  const heading = HEADINGS[active];

  const sidebar = (
    <div className="flex h-full flex-col gap-6 bg-ink p-4 text-white">
      <div className="flex items-center justify-between">
        <Link href="/" className="font-display text-xl font-extrabold tracking-tight">
          find<span className="text-accent">my</span>truck
        </Link>
        <button
          type="button"
          onClick={() => setDrawer(false)}
          className="rounded-lg p-1 text-white/60 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="rounded-xl bg-white/5 p-3">
        <div className="flex items-center gap-2">
          <Beacon live={live} />
          <span className="truncate text-sm font-semibold">{truck.name}</span>
        </div>
        <p className="mt-1 text-xs text-white/50">
          {live ? "Live now" : truck.is_active ? "Listed · offline" : "Not listed"}
        </p>
        <Link
          href={`/trucks/${truck.slug}`}
          target="_blank"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-white/60 transition hover:text-white"
        >
          View public profile <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => go(key)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
              active === key
                ? "bg-accent text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );

  return (
    <ToastProvider>
      <div className="flex min-h-dvh">
        {/* Desktop sidebar */}
        <aside className="hidden w-[250px] flex-shrink-0 lg:block">
          <div className="sticky top-0 h-dvh">{sidebar}</div>
        </aside>

        {/* Mobile drawer */}
        {drawer && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-ink/40"
              onClick={() => setDrawer(false)}
            />
            <div className="absolute left-0 top-0 h-full w-[260px] shadow-xl">{sidebar}</div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur sm:px-6">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="rounded-lg border border-line p-2 text-ink-soft lg:hidden"
              aria-label="Open menu"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-lg font-extrabold leading-tight text-ink sm:text-xl">
                {heading.title}
              </h1>
              <p className="truncate text-xs text-muted sm:text-sm">{heading.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => go("golive")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition",
                live
                  ? "bg-live/10 text-live"
                  : "bg-accent text-white shadow-sm hover:bg-accent-dark"
              )}
            >
              <Beacon live={live} />
              {live ? "Live" : "Go Live"}
            </button>
          </header>

          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
            {truck.claim_status === "pending" && (
              <div className="mb-5 rounded-2xl border border-amber/30 bg-amber/10 p-4 text-sm text-ink-soft">
                Your claim for <strong>{truck.name}</strong> is awaiting verification. You can edit
                everything now — a &ldquo;verified&rdquo; badge appears on your profile once approved.
              </div>
            )}
            <div key={active} className="panel-in">
              {active === "overview" && (
                <OverviewPanel {...props} onNavigate={go} />
              )}
              {active === "golive" && <GoLivePanel {...props} />}
              {active === "menu" && <MenuPanel truck={truck} />}
              {active === "schedule" && <SchedulePanel schedules={props.schedules} />}
              {active === "reviews" && <ReviewsPanel reviews={props.reviews} />}
              {active === "insights" && <InsightsPanel stats={props.stats} />}
              {active === "settings" && (
                <SettingsPanel truck={truck} photos={props.photos} />
              )}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
