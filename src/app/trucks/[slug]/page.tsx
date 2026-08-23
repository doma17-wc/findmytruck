import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTruckBySlug, getTruckPhotos, getTruckSchedule } from "@/lib/data";
import { DAY_LABELS, DAY_LABELS_SHORT } from "@/lib/types";
import { formatTimeRange, getMondayFirstDay } from "@/lib/geo";

export const revalidate = 300;

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const truck = await getTruckBySlug(params.slug);
  if (!truck) return {};

  const title = `${truck.name} — Food Truck in Zurich`;
  const description =
    truck.description ??
    `Find ${truck.name}'s schedule, menu, and location in Zurich on FindMyTruck.`;
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

  const [schedule, photos] = await Promise.all([
    getTruckSchedule(truck.id),
    getTruckPhotos(truck.id),
  ]);

  const today = getMondayFirstDay();
  const todaySchedule = schedule.filter((s) => s.day_of_week === today);
  const nextStop = todaySchedule[0] ?? schedule[0];

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
      addressLocality: "Zurich",
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
    <div className="min-h-dvh bg-white pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="relative h-56 w-full bg-neutral-200 sm:h-72">
        {truck.cover_photo_url && (
          <Image
            src={truck.cover_photo_url}
            alt={`${truck.name} cover photo`}
            fill
            priority
            className="object-cover"
          />
        )}
        <Link
          href="/"
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg shadow"
          aria-label="Back to map"
        >
          ←
        </Link>
      </div>

      <div className="relative px-4">
        <div className="absolute -top-10 h-20 w-20 overflow-hidden rounded-2xl border-4 border-white bg-neutral-100 shadow-md">
          {truck.logo_url ? (
            <Image src={truck.logo_url} alt={`${truck.name} logo`} fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl">🚚</div>
          )}
        </div>

        <div className="pt-12">
          <h1 className="text-2xl font-bold text-neutral-900">{truck.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
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
                className="flex-1 rounded-xl bg-brand py-3 text-center text-sm font-bold text-white shadow-sm active:bg-brand-600"
              >
                🧭 Get directions
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
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 text-lg"
                aria-label="Instagram"
              >
                📷
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
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 text-lg"
                aria-label="TikTok"
              >
                🎵
              </a>
            )}
            {truck.website && (
              <a
                href={truck.website.startsWith("http") ? truck.website : `https://${truck.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 text-lg"
                aria-label="Website"
              >
                🌐
              </a>
            )}
          </div>

          <section className="mt-8">
            <h2 className="text-lg font-bold text-neutral-900">Weekly schedule</h2>
            <div className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-100">
              {DAY_LABELS_SHORT.map((label, idx) => {
                const entries = schedule.filter((s) => s.day_of_week === idx);
                const isToday = idx === today;
                return (
                  <div
                    key={idx}
                    className={`flex items-start justify-between gap-3 px-4 py-3 ${
                      isToday ? "bg-brand-50" : ""
                    }`}
                  >
                    <span
                      className={`w-12 flex-shrink-0 text-sm font-semibold ${
                        isToday ? "text-brand" : "text-neutral-500"
                      }`}
                    >
                      {label}
                    </span>
                    {entries.length === 0 ? (
                      <span className="flex-1 text-sm text-neutral-400">Not operating</span>
                    ) : (
                      <div className="flex-1 space-y-1 text-right">
                        {entries.map((e) => (
                          <div key={e.id} className="text-sm text-neutral-700">
                            <span className="font-medium">{e.location_name}</span>
                            <span className="text-neutral-400"> · </span>
                            <span>{formatTimeRange(e.start_time, e.end_time)}</span>
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
            <section className="mt-8">
              <h2 className="text-lg font-bold text-neutral-900">Menu</h2>
              {truck.menu_text && (
                <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-neutral-700">
                  {truck.menu_text}
                </p>
              )}
              {truck.menu_photo_url && (
                <div className="relative mt-4 h-96 w-full overflow-hidden rounded-xl bg-neutral-100">
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
            <section className="mt-8">
              <h2 className="text-lg font-bold text-neutral-900">Gallery</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100"
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
