"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
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
import { DAY_LABELS_SHORT, type TruckPhoto } from "@/lib/types";
import { formatTimeRange, getMondayFirstDay } from "@/lib/geo";
import { isUnclaimed } from "@/lib/unclaimed";
import { createClient } from "@/lib/supabase/client";
import { recordTruckView } from "@/lib/trackView";
import type { DiscoverEntry } from "./types";
import { RatingBadge } from "./Bits";
import { dietaryPills } from "./helpers";

interface DetailSheetProps {
  entry: DiscoverEntry;
  now: Date;
  signedIn: boolean;
  favorited: boolean;
  isOwnerView: boolean;
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
  isOwnerView,
  onClose,
}: DetailSheetProps) {
  const { truck, status, schedules, rating } = entry;
  const unclaimed = isUnclaimed(truck);
  const menuItems = normalizeMenuItems(truck.menu_items);
  const pills = dietaryPills(truck.dietary_options ?? []);
  const websiteUrl = truck.website ?? truck.source_website ?? null;

  const today = getMondayFirstDay(now);
  const activeSchedule = status.schedule;
  const boosted = status.tier === "boosted";
  const available = status.tier !== "closed";
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

  useEffect(() => {
    recordTruckView(truck.id, isOwnerView);
  }, [truck.id, isOwnerView]);

  // Lazy-load the gallery only for the truck currently open in the sheet —
  // fetching photos for every pin/list row up front would be wasteful.
  const [photos, setPhotos] = useState<TruckPhoto[]>([]);
  useEffect(() => {
    let cancelled = false;
    setPhotos([]);
    void (async () => {
      const { data } = await createClient()
        .from("truck_photos")
        .select("*")
        .eq("truck_id", truck.id)
        .order("sort_order", { ascending: true });
      if (!cancelled && data) setPhotos(data as TruckPhoto[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [truck.id]);

  const fallbackImage = truck.cover_photo_url ?? truck.logo_url;
  const galleryImages = photos.length > 0 ? photos.map((p) => p.url) : fallbackImage ? [fallbackImage] : [];

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const onHeroScroll = () => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setActiveIdx(Math.round(el.scrollLeft / el.clientWidth));
  };

  const scrollToIndex = (i: number) => {
    const el = scrollRef.current;
    if (!el || galleryImages.length === 0) return;
    const clamped = (i + galleryImages.length) % galleryImages.length;
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  };

  // Desktop mouse-drag-to-scroll for the hero carousel. Touch pointers are
  // skipped entirely so native swipe/snap behavior is untouched.
  const dragRef = useRef<{ startX: number; startScroll: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch" || galleryImages.length < 2) return;
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = { startX: e.clientX, startScroll: el.scrollLeft };
    setIsDragging(true);
    el.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    const el = scrollRef.current;
    if (!state || !el) return;
    el.scrollLeft = state.startScroll - (e.clientX - state.startX);
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsDragging(false);
    const el = scrollRef.current;
    if (el && el.clientWidth > 0) {
      // Snap to the nearest photo instead of leaving it mid-scroll.
      scrollToIndex(Math.round(el.scrollLeft / el.clientWidth));
    }
    try {
      el?.releasePointerCapture(e.pointerId);
    } catch {
      // Pointer capture may already be released.
    }
  };

  // Let a vertical mouse-wheel / trackpad gesture drive the horizontal
  // carousel too (desktop has no touch swipe to fall back on).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || galleryImages.length < 2) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [galleryImages.length]);

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
        {/* Hero photo carousel */}
        <div className="group relative h-64 flex-shrink-0 bg-paper-deep sm:h-72">
          {galleryImages.length > 0 ? (
            <div
              ref={scrollRef}
              onScroll={onHeroScroll}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onDragStart={(e) => e.preventDefault()}
              className={`no-scrollbar flex h-full w-full select-none snap-x snap-mandatory overflow-x-auto ${
                isDragging
                  ? "cursor-grabbing"
                  : `scroll-smooth ${galleryImages.length > 1 ? "cursor-grab" : ""}`
              }`}
            >
              {galleryImages.map((src, i) => (
                <div key={src + i} className="relative h-full w-full flex-shrink-0 snap-center">
                  <Image
                    src={src}
                    alt={`${truck.name} photo ${i + 1}`}
                    fill
                    priority={i === 0}
                    draggable={false}
                    className="pointer-events-none object-cover"
                    sizes="460px"
                  />
                </div>
              ))}
            </div>
          ) : (
            <TruckPlaceholder name={truck.name} />
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-ink/10" />

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

          {galleryImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => scrollToIndex(activeIdx - 1)}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 shadow-md backdrop-blur-sm transition hover:bg-white active:scale-95 group-hover:opacity-100 sm:flex"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollToIndex(activeIdx + 1)}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 shadow-md backdrop-blur-sm transition hover:bg-white active:scale-95 group-hover:opacity-100 sm:flex"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
                {galleryImages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => scrollToIndex(i)}
                    aria-label={`Go to photo ${i + 1}`}
                    aria-current={i === activeIdx}
                    className="flex h-4 w-4 items-center justify-center"
                  >
                    <span
                      className={`h-1.5 rounded-full shadow-sm transition-all ${
                        i === activeIdx ? "w-4 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Scroll body */}
        <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-extrabold leading-tight text-ink">
                {truck.name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] font-medium text-ink-soft">
                <span>{truck.cuisine_type.join(" · ") || "Food truck"}</span>
                {truck.price_range && <span className="opacity-70">· {truck.price_range}</span>}
              </div>
            </div>
            <FavoriteButton
              truckId={truck.id}
              initialFavorited={favorited}
              signedIn={signedIn}
              size="md"
            />
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {rating && rating.count > 0 ? (
              <RatingBadge rating={rating} size="lg" />
            ) : (
              <span className="text-sm text-muted">No reviews yet</span>
            )}
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

          {/* Status card */}
          <div
            className={`mt-4 rounded-2xl border p-4 ${
              boosted
                ? "border-live/40 bg-live/5"
                : status.tier === "open"
                ? "border-green-500/25 bg-green-50"
                : "border-line bg-card"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                  boosted
                    ? "bg-live text-white"
                    : status.tier === "open"
                    ? "bg-green-100 text-green-700 ring-1 ring-inset ring-green-500/25"
                    : "bg-neutral-200 text-neutral-600"
                }`}
              >
                {boosted && (
                  <span className="relative flex h-1.5 w-1.5 text-white">
                    <span className="live-beacon absolute inset-0" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-current" />
                  </span>
                )}
                {status.label}
              </span>
              {available && status.openUntil && (
                <span className="text-[13px] text-ink-soft">
                  Serving until {status.openUntil}
                </span>
              )}
              {!available && status.detail && (
                <span className="text-[13px] text-ink-soft">{status.detail}</span>
              )}
            </div>

            {boosted && (
              <p className="mt-1.5 text-[12px] font-semibold text-live">
                ● {status.detail}
              </p>
            )}

            {activeSchedule && (
              <p className="mt-2.5 flex items-start gap-1.5 text-[13px] text-ink-soft">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" />
                {activeSchedule.location_name}
                {status.isRegionFallback && " · exact spot to be confirmed"}
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
