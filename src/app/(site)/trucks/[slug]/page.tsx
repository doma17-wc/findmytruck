import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe, Music2, Navigation } from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";
import { getTruckBySlug, getTruckPhotos, getTruckSchedule } from "@/lib/data";
import { DAY_LABELS, DAY_LABELS_SHORT } from "@/lib/types";
import { formatTimeRange, getMondayFirstDay, isNowWithin } from "@/lib/geo";
import { getCurrentUserProfile, createClient } from "@/lib/supabase/server";
import FavoriteButton from "@/components/FavoriteButton";

export const revalidate = 300;

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const truck = await getTruckBySlug(params.slug);
  if (!truck) return {};

  const title = `${truck.name} — Food Truck in Switzerland`;
  const description =
    truck.description ??
    `Find ${truck.name}'s schedule, menu, and location in Switzerland on FindMyTruck.`;
  const images = truck.cover_photo_url ? [truck.cover_photo_url] : [];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images,
      type: "profile",
      url: `https://findmytruck.ch/trucks/${truck.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
    alternates: {
      canonical: `https://findmytruck.ch/trucks/${truck.slug}`,
    },
  };
}

export default async function TruckProfilePage({ params }: PageProps) {
  const truck = await getTruckBySlug(params.slug);
  if (!truck) notFound();

  const [schedule, photos, auth] = await Promise.all([
    getTruckSchedule(truck.id),
    getTruckPhotos(truck.id),
    getCurrentUserProfile(),
  ]);

  const supabase = createClient();
  void supabase.from("truck_page_views").insert({ truck_id: truck.id });

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

  const today = getMondayFirstDay();
  const todaySchedule = schedule.filter((s) => s.day_of_week === today);
  const nextStop = todaySchedule[0] ?? schedule[0];
  const openNow = todaySchedule.some((s) => isNowWithin(s.start_time, s.end_time));

  const directionsUrl = nextStop
    ? `https://www.google.com/maps/dir/?api=1&destination=${nextStop.location_lat},${nextStop.location_lng}`
    : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: truck.name,
    description: truck.description ?? undefined,
    image: truck.cover_photo_url ?? truck.logo_url ?? undefined,
    servesCuisine: truck.cuisine_type,
    priceRange: truck.price_range ?? undefined,
    url: `https://findmytruck.ch/trucks/${truck.slug}`,
    sameAs: [truck.instagram, truck.tiktok, truck.website].filter(Boolean),
    address: {
      "@type": "PostalAddress",
      ...(nextStop?.location_name && { addressLocality: nextStop.location_name }),
      addressCountry: "CH",
    },
    ...(nextStop && {
      geo: {
        "@type": "GeoCoordinates",
        latitude: nextStop.location_lat,
        longitude: nextStop.location_lng,
      },
    }),
    openingHoursSpecification: schedule.map((s) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${DAY_LABELS[s.day_of_week]}`,
      opens: s.start_time.slice(0, 5),
      closes: s.end_time.slice(0, 5),
    })),
  };

  return (
    <div className="min-h-dvh bg-white pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="relative h-64 w-full bg-neutral-200 sm:h-80">
        {truck.cover_photo_url ? (
          <Image
            src={truck.cover_photo_url}
            alt={`${truck.name} cover photo`}
            fill
            priority
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950 text-6xl">
            🚚
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/10" />

        <Link
          href="/"
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow backdrop-blur-sm transition hover:bg-white"
          aria-label="Back to map"
        >
          <ArrowLeft className="h-5 w-5 text-neutral-800" />
        </Link>

        <div className="absolute right-4 top-4">
          <FavoriteButton truckId={truck.id} initialFavorited={isFavorited} signedIn={Boolean(auth)} />
        </div>
      </div>

      <div className="relative px-4">
        <div className="absolute -top-12 h-24 w-24 overflow-hidden rounded-2xl border-4 border-white bg-neutral-100 shadow-lg">
          {truck.logo_url ? (
            <Image src={truck.logo_url} alt={`${truck.name} logo`} fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl">🚚</div>
          )}
        </div>

        <div className="pt-16">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
              {truck.name}
            </h1>
            <span
              className={`mt-1 flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                openNow ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {openNow ? "Open now" : "Closed"}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {truck.cuisine_type.map((c) => (
              <span
                key={c}
                className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand"
              >
                {c}
              </span>
            ))}
            {truck.price_range && (
              <span className="text-sm font-medium text-neutral-500">{truck.price_range}</span>
            )}
          </div>

          {truck.description && (
            <p className="mt-4 text-[15px] leading-relaxed text-neutral-700">{truck.description}</p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand py-3 text-center text-sm font-bold text-white shadow-sm shadow-brand/30 transition hover:brightness-105 active:scale-[0.99]"
              >
                <Navigation className="h-4 w-4" />
                Get directions
              </a>
            )}
            {truck.instagram && (
              <a
                href={
                  truck.instagram.startsWith("http")
                    ? truck.instagram
                    : `https://instagram.com/${truck.instagram.replace(/^@/, "")}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 text-neutral-700 transition hover:border-brand hover:text-brand"
                aria-label="Instagram"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
            )}
            {truck.tiktok && (
              <a
                href={
                  truck.tiktok.startsWith("http")
                    ? truck.tiktok
                    : `https://tiktok.com/@${truck.tiktok.replace(/^@/, "")}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 text-neutral-700 transition hover:border-brand hover:text-brand"
                aria-label="TikTok"
              >
                <Music2 className="h-5 w-5" />
              </a>
            )}
            {truck.website && (
              <a
                href={truck.website.startsWith("http") ? truck.website : `https://${truck.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 text-neutral-700 transition hover:border-brand hover:text-brand"
                aria-label="Website"
              >
                <Globe className="h-5 w-5" />
              </a>
            )}
          </div>

          <section className="mt-9">
            <h2 className="text-lg font-bold text-neutral-900">Weekly schedule</h2>
            <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-100 shadow-card">
              {DAY_LABELS_SHORT.map((label, idx) => {
                const entries = schedule.filter((s) => s.day_of_week === idx);
                const isToday = idx === today;
                return (
                  <div
                    key={idx}
                    className={`grid grid-cols-[3.5rem_1fr] gap-3 border-b border-neutral-100 px-4 py-3 last:border-b-0 ${
                      isToday ? "bg-brand-50/70" : ""
                    }`}
                  >
                    <span
                      className={`text-sm font-bold ${isToday ? "text-brand" : "text-neutral-400"}`}
                    >
                      {label}
                    </span>
                    {entries.length === 0 ? (
                      <span className="text-sm text-neutral-300">—</span>
                    ) : (
                      <div className="space-y-1">
                        {entries.map((e) => (
                          <div key={e.id} className="text-sm text-neutral-700">
                            <span className="font-semibold">{e.location_name}</span>
                            <span className="text-neutral-300"> · </span>
                            <span className="text-neutral-500">
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

          {(truck.menu_text || truck.menu_photo_url) && (
            <section className="mt-9">
              <h2 className="text-lg font-bold text-neutral-900">Menu</h2>
              {truck.menu_text && (
                <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-neutral-700">
                  {truck.menu_text}
                </p>
              )}
              {truck.menu_photo_url && (
                <div className="relative mt-4 h-96 w-full overflow-hidden rounded-2xl bg-neutral-100">
                  <Image
                    src={truck.menu_photo_url}
                    alt={`${truck.name} menu`}
                    fill
                    className="object-contain"
                  />
                </div>
              )}
            </section>
          )}

          {photos.length > 0 && (
            <section className="mt-9">
              <h2 className="text-lg font-bold text-neutral-900">Gallery</h2>
              <div className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto pb-1">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square h-40 w-40 flex-shrink-0 overflow-hidden rounded-2xl bg-neutral-100 sm:h-48 sm:w-48"
                  >
                    <Image
                      src={photo.url}
                      alt={photo.caption ?? truck.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
