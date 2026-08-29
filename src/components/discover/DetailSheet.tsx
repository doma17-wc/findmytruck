"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  ExternalLink,
  Globe,
  MapPin,
  Music2,
  Navigation,
  X,
} from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";
import TruckPlaceholder from "@/components/site/TruckPlaceholder";
import TruckMenu from "@/components/site/TruckMenu";
import FavoriteButton from "@/components/FavoriteButton";
import { normalizeMenuItems } from "@/lib/menu";
import { DAY_LABELS_SHORT } from "@/lib/types";
import { formatTimeRange, getMondayFirstDay } from "@/lib/geo";
import { isUnclaimed } from "@/lib/unclaimed";
import type { DiscoverEntry } from "./types";
import { RatingBadge } from "./Bits";
import { dietaryPills, timeAgo } from "./helpers";

interface DetailSheetProps {
  entry: DiscoverEntry;
  now: Date;
  signedIn: boolean;
  favorited: boolean;
  onClose: () => void;
}

function socialUrl(kind: "instagram" | "tiktok", handle: string): string {
  if (handle.startsWith("http")) return handle;
  const h = handle.replace(/^@/, "");
  return kind === "instagram" ? `https://instagram.com/${h}` : `https://tiktok.com/@${h}`;
}

export default function DetailSheet({
  entry,
  now,
  signedIn,
  favorited,
  onClose,
}: DetailSheetProps) {
  const { truck, status, schedules, rating, live, liveSince } = entry;
  const unclaimed = isUnclaimed(truck);
  const menuItems = normalizeMenuItems(truck.menu_items);
  const pills = dietaryPills(truck.dietary_options ?? []);
  const websiteUrl = truck.website ?? truck.source_website ?? null;

  const today = getMondayFirstDay(now);
  const activeSchedule = status.schedule;
  const open = status.state === "open";
  const weekly = schedules.filter((s) => s.specific_date == null);

  const directionsUrl = activeSchedule
    ? `https://www.google.com/maps/dir/?api=1&destination=${activeSchedule.location_lat},${activeSchedule.location_lng}`
    : undefined;

  const plate = truck.short_code ?? `FMT-${truck.slug.slice(0, 6).toUpperCase()}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const heroImage = truck.cover_photo_url ?? truck.logo_url;

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="scrim-in absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={truck.name}
        className="sheet-in absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col bg-paper shadow-2xl"
      >
        {/* Hero */}
        <div className="relative h-52 flex-shrink-0 bg-paper-deep">
          {heroImage ? (
            <Image src={heroImage} alt={truck.name} fill className="object-cover" sizes="460px" />
          ) : (
            <TruckPlaceholder name={truck.name} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-ink/10" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-md backdrop-blur-sm transition hover:bg-white active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>

          <span className="absolute left-3 top-3 rounded-md bg-ink/80 px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-white">
            {plate}
          </span>

          <div className="absolute bottom-3 left-4 right-4">
            <h2 className="font-display text-2xl font-extrabold leading-tight text-white drop-shadow">
              {truck.name}
            </h2>
            <div className="mt-1 flex items-center gap-2 text-[13px] font-medium text-white/90">
              <span>{truck.cuisine_type.join(" · ") || "Food truck"}</span>
              {truck.price_range && <span className="opacity-80">· {truck.price_range}</span>}
            </div>
          </div>
        </div>

        {/* Scroll body */}
        <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            {rating && rating.count > 0 ? (
              <RatingBadge rating={rating} size="lg" />
            ) : (
              <span className="text-sm text-muted">No reviews yet</span>
            )}
            <FavoriteButton
              truckId={truck.id}
              initialFavorited={favorited}
              signedIn={signedIn}
              size="md"
            />
          </div>

          {pills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {pills.map((p) => (
                <span
                  key={p.label}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${p.className}`}
                >
                  {p.label}
                </span>
              ))}
            </div>
          )}

          {/* Live status card */}
          <div
            className={`mt-4 rounded-2xl border p-4 ${
              open ? "border-live/30 bg-live/5" : "border-line bg-card"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                  open ? "bg-live text-white" : "bg-neutral-200 text-neutral-600"
                }`}
              >
                {open && (
                  <span className="relative flex h-1.5 w-1.5 text-white">
                    <span className="live-beacon absolute inset-0" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-current" />
                  </span>
                )}
                {open ? (live ? "Live now" : "Open now") : status.label}
              </span>
              {open && activeSchedule && (
                <span className="text-[13px] text-ink-soft">
                  Serving until {activeSchedule.end_time.slice(0, 5)}
                </span>
              )}
            </div>

            {activeSchedule && (
              <p className="mt-2.5 flex items-start gap-1.5 text-[13px] text-ink-soft">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" />
                {activeSchedule.location_name}
                {status.isRegionFallback && " · exact spot to be confirmed"}
              </p>
            )}

            {live && liveSince && (
              <p className="mt-1.5 text-[12px] font-semibold text-live">
                ● Confirmed live {timeAgo(liveSince, now)}
              </p>
            )}

            {directionsUrl && !status.isRegionFallback && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-[13px] font-bold text-white shadow-sm shadow-brand/30 transition hover:brightness-105 active:scale-[0.99]"
              >
                <Navigation className="h-4 w-4" />
                Get directions
              </a>
            )}
          </div>

          {/* Menu */}
          {menuItems.length > 0 && (
            <section className="mt-5">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted">
                Menu
              </h3>
              <TruckMenu items={menuItems} />
            </section>
          )}

          {/* Weekly schedule */}
          {weekly.length > 0 && (
            <section className="mt-5">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted">
                Weekly tour
              </h3>
              <div className="mt-2 overflow-hidden rounded-2xl border border-line shadow-paper">
                {DAY_LABELS_SHORT.map((label, idx) => {
                  const entries = weekly.filter((s) => s.day_of_week === idx);
                  const isToday = idx === today;
                  return (
                    <div
                      key={idx}
                      className={`grid grid-cols-[3rem_1fr] gap-3 border-b border-line px-3.5 py-2.5 last:border-b-0 ${
                        isToday ? "bg-brand-50/70" : "bg-card"
                      }`}
                    >
                      <span
                        className={`text-[13px] font-bold ${
                          isToday ? "text-brand" : "text-muted"
                        }`}
                      >
                        {label}
                      </span>
                      {entries.length === 0 ? (
                        <span className="text-[13px] text-neutral-300">—</span>
                      ) : (
                        <div className="space-y-1">
                          {entries.map((e) => (
                            <div key={e.id} className="text-[13px] text-ink-soft">
                              <span className="font-semibold text-ink">{e.location_name}</span>{" "}
                              <span className="font-mono text-muted">
                                {formatTimeRange(e.start_time, e.end_time)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Links */}
          {(truck.instagram || truck.tiktok || websiteUrl) && (
            <div className="mt-5 flex gap-2">
              {truck.instagram && (
                <a
                  href={socialUrl("instagram", truck.instagram)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-card text-ink-soft transition hover:border-brand hover:text-brand"
                >
                  <InstagramIcon className="h-5 w-5" />
                </a>
              )}
              {truck.tiktok && (
                <a
                  href={socialUrl("tiktok", truck.tiktok)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-card text-ink-soft transition hover:border-brand hover:text-brand"
                >
                  <Music2 className="h-5 w-5" />
                </a>
              )}
              {websiteUrl && (
                <a
                  href={websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Website"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-card text-ink-soft transition hover:border-brand hover:text-brand"
                >
                  <Globe className="h-5 w-5" />
                </a>
              )}
            </div>
          )}

          {unclaimed && (
            <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-50 p-4">
              <p className="text-sm font-bold text-ink">Is this your truck?</p>
              <p className="mt-1 text-[13px] text-ink-soft">
                This profile was built from public sources. Claim it to add your real schedule,
                menu, and photos.
              </p>
              <Link
                href={`/claim/${truck.slug}`}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[13px] font-bold text-white shadow-sm shadow-brand/30 transition hover:brightness-105"
              >
                <BadgeCheck className="h-4 w-4" />
                Claim this profile
              </Link>
            </div>
          )}

          <Link
            href={`/trucks/${truck.slug}`}
            className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-line bg-card py-3 text-[13px] font-bold text-ink-soft transition hover:border-brand hover:text-brand"
          >
            <ExternalLink className="h-4 w-4" />
            Open full profile
          </Link>

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}
