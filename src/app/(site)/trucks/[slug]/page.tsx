import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTruckBySlug, getTruckPhotos, getTruckSchedule } from "@/lib/data";
import { getEventsForTruck } from "@/lib/events";
import { getReviewsForTruck, summarize } from "@/lib/reviews";
import { getBooleanSetting } from "@/lib/settings";
import { DAY_LABELS } from "@/lib/types";
import { normalizeMenuItems } from "@/lib/menu";
import { isUnclaimed } from "@/lib/unclaimed";
import { computeTruckStatus, getMondayFirstDay, readBoost } from "@/lib/geo";
import { getCurrentUserProfile, createClient } from "@/lib/supabase/server";
import { OG_LOCALE_DEFAULTS } from "@/lib/seo";
import FavoriteButton from "@/components/FavoriteButton";
import ViewTracker from "@/components/shared/ViewTracker";
import GalleryWithTracking from "@/components/truck/GalleryWithTracking";
import TruckProfileSections, { type ProfileStatus } from "@/components/truck/TruckProfileSections";

export const revalidate = 300;

interface PageProps {
  params: { slug: string };
}

const SITE = "https://findmytruck.ch";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const truck = await getTruckBySlug(params.slug);
  if (!truck) return {};

  // Best-effort city/region hint for local search ("Foodtruck <Stadt>") —
  // prefer the truck's home region, else the city from its first known stop
  // (a full street address like "Bahnhofstrasse 1, 8001 Zürich" — take the
  // last comma-separated segment and drop any leading postal code).
  let cityHint = truck.source_region ?? null;
  if (!cityHint) {
    const schedule = await getTruckSchedule(truck.id);
    const locationName = schedule[0]?.location_name ?? null;
    cityHint = locationName
      ? locationName.split(",").pop()!.trim().replace(/^\d{4}\s+/, "")
      : null;
  }

  const cuisine = truck.cuisine_type?.length ? truck.cuisine_type.join(", ") : null;
  const title = `${truck.name} – Foodtruck`;
  const description =
    truck.description ??
    `${truck.name} ist ein Foodtruck${cuisine ? ` für ${cuisine}` : ""}${
      cityHint ? ` in ${cityHint}` : " in der Schweiz"
    }. Sieh auf FindMyTruck live, wann und wo er als Nächstes steht — inklusive Speisekarte und Öffnungszeiten.`;
  const images = truck.cover_photo_url ? [truck.cover_photo_url] : [];
  // openGraph.title isn't run through the root layout's title template, so
  // spell out the " | FindMyTruck" suffix here to match the <title> tag.
  const ogTitle = `${title} | FindMyTruck`;

  return {
    title,
    description,
    openGraph: {
      ...OG_LOCALE_DEFAULTS,
      title: ogTitle,
      description,
      images,
      type: "profile",
      url: `${SITE}/trucks/${truck.slug}`,
    },
    twitter: { card: "summary_large_image", title: ogTitle, description, images },
    alternates: { canonical: `${SITE}/trucks/${truck.slug}` },
  };
}

export default async function TruckProfilePage({ params }: PageProps) {
  const truck = await getTruckBySlug(params.slug);
  if (!truck) notFound();

  const [schedule, photos, auth, events, reviews, reviewsRequireLogin] = await Promise.all([
    getTruckSchedule(truck.id),
    getTruckPhotos(truck.id),
    getCurrentUserProfile(),
    getEventsForTruck(truck.id, { upcomingOnly: true }),
    getReviewsForTruck(truck.id),
    getBooleanSetting("reviews_require_login", false),
  ]);

  const reviewSummary = summarize(reviews);
  const supabase = createClient();

  let isFavorited = false;
  if (auth) {
    const { data } = await supabase
      .from("user_favorites")
      .select("truck_id")
      .eq("user_id", auth.user.id)
      .eq("truck_id", truck.id)
      .maybeSingle();
    isFavorited = Boolean(data);
  }

  const isOwnerView = (auth?.ownedTruckIds ?? []).includes(truck.id);
  const menuItems = normalizeMenuItems(truck.menu_items);
  const unclaimed = isUnclaimed(truck);

  const today = getMondayFirstDay();
  const status = computeTruckStatus(schedule, new Date(), readBoost(truck));
  const boosted = status.tier === "boosted";
  const openNow = status.tier !== "closed";

  const destSchedule = status.schedule && !status.isRegionFallback ? status.schedule : null;
  const directionsUrl = destSchedule
    ? `https://www.google.com/maps/dir/?api=1&destination=${destSchedule.location_lat},${destSchedule.location_lng}`
    : null;

  const profileStatus: ProfileStatus = {
    tier: status.tier,
    boosted,
    headline: boosted ? "Boosted" : status.tier === "open" ? "Open" : "Planned",
    sub: boosted
      ? status.detail
      : status.tier === "open" && status.openUntil
      ? `Serving until ${status.openUntil}`
      : null,
    next: status.tier === "closed" ? status.next ?? null : null,
    locationName:
      status.schedule?.location_name ??
      (unclaimed ? truck.source_region ?? "Location to be confirmed" : null),
    locationNote:
      status.isRegionFallback || (!status.schedule && unclaimed)
        ? "exact spot to be confirmed"
        : null,
  };

  const galleryImages =
    photos.length > 0
      ? photos.map((p) => p.url)
      : truck.cover_photo_url
      ? [truck.cover_photo_url]
      : truck.logo_url
      ? [truck.logo_url]
      : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: truck.name,
    inLanguage: "de-CH",
    description: truck.description ?? undefined,
    image: truck.cover_photo_url ?? truck.logo_url ?? undefined,
    servesCuisine: truck.cuisine_type,
    priceRange: truck.price_range ?? undefined,
    url: `${SITE}/trucks/${truck.slug}`,
    sameAs: [truck.instagram, truck.tiktok, truck.website].filter(Boolean),
    address: {
      "@type": "PostalAddress",
      ...(destSchedule?.location_name && { addressLocality: destSchedule.location_name }),
      addressCountry: "CH",
    },
    ...(destSchedule && {
      geo: {
        "@type": "GeoCoordinates",
        latitude: destSchedule.location_lat,
        longitude: destSchedule.location_lng,
      },
    }),
    openingHoursSpecification: schedule
      .filter((s) => s.specific_date == null && s.start_time !== s.end_time)
      .map((s) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${DAY_LABELS[s.day_of_week]}`,
        opens: s.start_time.slice(0, 5),
        closes: s.end_time.slice(0, 5),
      })),
    ...(reviewSummary.count > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: reviewSummary.avg,
        reviewCount: reviewSummary.count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };

  return (
    <div className="min-h-dvh bg-paper pb-24">
      <ViewTracker truckId={truck.id} isOwnerView={isOwnerView} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="lg:mx-auto lg:max-w-[1180px] lg:px-8 lg:pt-8">
        <GalleryWithTracking
          truckId={truck.id}
          isOwnerView={isOwnerView}
          images={galleryImages}
          name={truck.name}
          variant="page"
          overlayTopLeft={
            <Link
              href="/"
              aria-label="Back to map"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-md backdrop-blur-sm transition hover:bg-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          }
          overlayTopRight={
            <FavoriteButton
              truckId={truck.id}
              initialFavorited={isFavorited}
              signedIn={Boolean(auth)}
            />
          }
        />
      </div>

      <div className="mx-auto -mt-6 max-w-2xl rounded-t-3xl bg-paper px-4 pt-6 sm:px-6 lg:mt-0 lg:max-w-[1180px] lg:rounded-none lg:px-8 lg:pt-10">
        <TruckProfileSections
          truck={truck}
          menuItems={menuItems}
          schedules={schedule}
          events={events}
          rating={{ avg: reviewSummary.avg, count: reviewSummary.count }}
          signedIn={Boolean(auth)}
          favorited={isFavorited}
          isOwnerView={isOwnerView}
          reviewsRequireLogin={reviewsRequireLogin}
          shareUrl={`${SITE}/trucks/${truck.slug}`}
          status={profileStatus}
          directionsUrl={directionsUrl}
          tour={{
            highlightDay: today,
            highlightLabel: "Today",
            openUntil: openNow ? status.openUntil : null,
          }}
          variant="page"
          initialReviews={reviews}
        />
      </div>
    </div>
  );
}
