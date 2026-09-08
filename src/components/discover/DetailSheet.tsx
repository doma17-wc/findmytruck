"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import { normalizeMenuItems } from "@/lib/menu";
import { type TruckPhoto } from "@/lib/types";
import { getMondayFirstDay } from "@/lib/geo";
import { useLang, weekdayName } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { recordTruckView } from "@/lib/trackView";
import ProfileGallery from "@/components/truck/ProfileGallery";
import TruckProfileSections, { type ProfileStatus } from "@/components/truck/TruckProfileSections";
import type { DiscoverEntry } from "./types";

interface DetailSheetProps {
  entry: DiscoverEntry;
  now: Date;
  signedIn: boolean;
  favorited: boolean;
  isOwnerView: boolean;
  reviewsRequireLogin?: boolean;
  onClose: () => void;
}

export default function DetailSheet({
  entry,
  now,
  signedIn,
  favorited,
  isOwnerView,
  reviewsRequireLogin = false,
  onClose,
}: DetailSheetProps) {
  const { truck, status, schedules, rating, events, dayPlan } = entry;
  const { lang } = useLang();
  const menuItems = normalizeMenuItems(truck.menu_items);

  const today = getMondayFirstDay(now);
  const activeSchedule = status.schedule;
  const boosted = status.tier === "boosted" && !dayPlan;
  const available = status.tier !== "closed";

  const planRange = dayPlan
    ? dayPlan.start && dayPlan.end
      ? `${dayPlan.start}–${dayPlan.end}`
      : dayPlan.start || ""
    : null;
  const planLocationName = dayPlan?.locationName ?? activeSchedule?.location_name ?? null;

  const destination =
    dayPlan && !activeSchedule
      ? `${entry.coord[1]},${entry.coord[0]}`
      : activeSchedule
      ? `${activeSchedule.location_lat},${activeSchedule.location_lng}`
      : null;
  const directionsUrl =
    destination && !status.isRegionFallback
      ? `https://www.google.com/maps/dir/?api=1&destination=${destination}`
      : null;

  const profileStatus: ProfileStatus = {
    tier: dayPlan ? "open" : status.tier,
    boosted,
    headline: dayPlan
      ? `${weekdayName(dayPlan.date, lang, "short")}${planRange ? ` · ${planRange}` : ""}`
      : boosted
      ? "Boosted"
      : status.tier === "open"
      ? "Open"
      : "Planned",
    sub: dayPlan
      ? dayPlan.fromEvent
        ? "At an event 🎪"
        : null
      : boosted
      ? status.detail
      : available && status.openUntil
      ? `Serving until ${status.openUntil}`
      : null,
    next: !dayPlan && status.tier === "closed" ? status.next ?? null : null,
    locationName: planLocationName,
    locationNote: status.isRegionFallback ? "exact spot to be confirmed" : null,
  };

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/trucks/${truck.slug}`
      : `https://findmytruck.ch/trucks/${truck.slug}`;

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

  // Lazy-load the gallery only for the truck currently open in the sheet.
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
  const galleryImages =
    photos.length > 0 ? photos.map((p) => p.url) : fallbackImage ? [fallbackImage] : [];

  const plate = truck.short_code ?? `FMT-${truck.slug.slice(0, 6).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="scrim-in absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={truck.name}
        className="sheet-in absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col bg-paper shadow-2xl"
      >
        <ProfileGallery
          images={galleryImages}
          name={truck.name}
          variant="sheet"
          overlayTopLeft={
            <span className="rounded-md bg-ink/80 px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-white">
              {plate}
            </span>
          }
          overlayTopRight={
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-md backdrop-blur-sm transition hover:bg-white active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          }
        />

        <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-5">
          <TruckProfileSections
            truck={truck}
            menuItems={menuItems}
            schedules={schedules}
            events={events}
            rating={rating ?? { avg: 0, count: 0 }}
            signedIn={signedIn}
            favorited={favorited}
            isOwnerView={isOwnerView}
            reviewsRequireLogin={reviewsRequireLogin}
            shareUrl={shareUrl}
            status={profileStatus}
            directionsUrl={directionsUrl}
            tour={{
              highlightDay: dayPlan ? getMondayFirstDay(dayPlan.date) : today,
              highlightLabel: dayPlan ? weekdayName(dayPlan.date, lang, "long") : "Today",
              openUntil: !dayPlan && available ? status.openUntil : null,
            }}
            variant="sheet"
            footer={
              <Link
                href={`/trucks/${truck.slug}`}
                className="flex items-center justify-center gap-2 rounded-xl border border-line bg-card py-3 text-[13px] font-bold text-ink-soft transition hover:border-brand hover:text-brand"
              >
                <ExternalLink className="h-4 w-4" />
                Open full profile
              </Link>
            }
          />
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}
