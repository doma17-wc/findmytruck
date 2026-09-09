import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import type { EventWithTrucks, PublicTruck, TruckSchedule } from "@/lib/types";
import type { MenuItem } from "@/lib/menu";
import type { NextAppearance, TruckTier } from "@/lib/geo";
import { isUnclaimed } from "@/lib/unclaimed";
import { dietaryPills } from "@/components/discover/helpers";
import ReviewsSection from "@/components/reviews/ReviewsSection";
import QuickActions from "./QuickActions";
import MenuBoard from "./MenuBoard";
import WeeklyTour from "./WeeklyTour";
import StatusCard from "./StatusCard";
import TruckEventCard from "./TruckEventCard";
import CateringSection from "./CateringSection";
import { ProfileStatusPill, RatingLine, SectionHeading } from "./pieces";

export interface ProfileStatus {
  tier: TruckTier;
  headline: string;
  boosted: boolean;
  sub?: string | null;
  next?: NextAppearance | null;
  locationName?: string | null;
  locationNote?: string | null;
}

interface TruckProfileSectionsProps {
  truck: PublicTruck;
  menuItems: MenuItem[];
  schedules: TruckSchedule[];
  events: EventWithTrucks[];
  rating: { avg: number; count: number };
  signedIn: boolean;
  favorited: boolean;
  isOwnerView: boolean;
  reviewsRequireLogin: boolean;
  shareUrl: string;
  status: ProfileStatus;
  directionsUrl?: string | null;
  tour: { highlightDay: number; highlightLabel: string; openUntil: string | null };
  /** "sheet" = slide-over (tighter, row event cards), "page" = full profile. */
  variant: "sheet" | "page";
  /** Server-fetched reviews for SEO on the full page. */
  initialReviews?: React.ComponentProps<typeof ReviewsSection>["initialReviews"];
  /** Rendered under the header on the sheet ("Open full profile" link). */
  footer?: React.ReactNode;
}

export default function TruckProfileSections({
  truck,
  menuItems,
  schedules,
  events,
  rating,
  signedIn,
  favorited,
  isOwnerView,
  reviewsRequireLogin,
  shareUrl,
  status,
  directionsUrl,
  tour,
  variant,
  initialReviews,
  footer,
}: TruckProfileSectionsProps) {
  const unclaimed = isUnclaimed(truck);
  const pills = dietaryPills(truck.dietary_options ?? []);
  const websiteUrl = truck.website ?? truck.source_website ?? null;
  const compact = variant === "sheet";

  return (
    <div className={compact ? "space-y-5" : "space-y-7"}>
      {/* Identity */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {!unclaimed && (
            <ProfileStatusPill tier={status.boosted ? "boosted" : status.tier} label={status.headline} />
          )}
          {unclaimed && (
            <span className="inline-flex items-center rounded-full bg-neutral-200 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-neutral-600">
              Unclaimed
            </span>
          )}
        </div>

        <h1
          className={`mt-2 font-display font-extrabold leading-tight text-ink ${
            compact ? "text-2xl" : "text-3xl sm:text-4xl"
          }`}
        >
          {truck.name}
        </h1>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] font-medium text-ink-soft">
          <span>{truck.cuisine_type.join(" · ") || "Food truck"}</span>
          {truck.price_range && <span className="text-muted">· {truck.price_range}</span>}
        </div>

        <div className="mt-2">
          <RatingLine avg={rating.avg} count={rating.count} />
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

        {truck.description && (
          <p className={`mt-3 leading-relaxed text-ink-soft ${compact ? "text-[14px]" : "text-[15px]"}`}>
            {truck.description}
          </p>
        )}
      </div>

      {/* Quick actions */}
      <QuickActions
        truckId={truck.id}
        favorited={favorited}
        signedIn={signedIn}
        isOwnerView={isOwnerView}
        directionsUrl={directionsUrl}
        shareUrl={shareUrl}
        shareTitle={truck.name}
        instagram={truck.instagram}
        tiktok={truck.tiktok}
        website={websiteUrl}
        phone={truck.phone}
        email={truck.email}
        truckName={truck.name}
      />

      {/* Where are they */}
      <StatusCard
        tier={status.tier}
        headline={status.headline}
        boosted={status.boosted}
        sub={status.sub}
        next={status.next}
        locationName={status.locationName}
        locationNote={status.locationNote}
        directionsUrl={directionsUrl}
      />

      {/* Menu */}
      {menuItems.length > 0 && (
        <section>
          <SectionHeading>Menu</SectionHeading>
          <MenuBoard items={menuItems} />
        </section>
      )}

      {/* Weekly tour */}
      {schedules.some((s) => s.specific_date == null && s.start_time !== s.end_time) && (
        <section>
          <SectionHeading>Weekly tour</SectionHeading>
          <WeeklyTour
            schedules={schedules}
            highlightDay={tour.highlightDay}
            highlightLabel={tour.highlightLabel}
            openUntil={tour.openUntil}
          />
        </section>
      )}

      {/* Upcoming events */}
      {events.length > 0 && (
        <section>
          <SectionHeading>Upcoming events</SectionHeading>
          {compact ? (
            <div className="mt-2 space-y-2.5">
              {events.map((e) => (
                <TruckEventCard key={e.id} event={e} variant="row" />
              ))}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {events.map((e) => (
                <TruckEventCard key={e.id} event={e} variant="grid" />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Catering */}
      <CateringSection truck={truck} />

      {/* Claim CTA */}
      {unclaimed && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <p className="text-sm font-bold text-ink">Is this your truck?</p>
          <p className="mt-1 text-[13px] text-ink-soft">
            This profile was built from public sources. Claim it to add your real schedule, menu, and
            photos.
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

      {/* Reviews */}
      <div id="reviews" className="scroll-mt-24">
        <ReviewsSection
          truckId={truck.id}
          truckName={truck.name}
          signedIn={signedIn}
          requireLogin={reviewsRequireLogin}
          initialReviews={initialReviews}
          compact={compact}
        />
      </div>

      {footer}
    </div>
  );
}
