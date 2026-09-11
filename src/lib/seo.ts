import type { Metadata } from "next";
import type { City } from "./cities";

export const SITE_URL = "https://findmytruck.ch";
export const SITE_NAME = "FindMyTruck";

/** Shared German/Switzerland defaults so every route's openGraph carries the
 *  right locale even when it otherwise overrides the parent layout's. */
export const OG_LOCALE_DEFAULTS: { locale: string; alternateLocale: string[]; siteName: string } = {
  locale: "de_CH",
  alternateLocale: ["en_CH"],
  siteName: SITE_NAME,
};

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Metadata for a Swiss city's foodtruck browse page — /<slug>. */
export function buildCityMetadata(city: City): Metadata {
  const title = `Foodtrucks in ${city.name} – Live-Karte`;
  const description = `Finde Foodtrucks in ${city.name} live auf der Karte: sieh, welche Trucks gerade offen sind, checke Standorte, Öffnungszeiten und Speisekarten in ${city.name} und Umgebung.`;
  const url = absoluteUrl(`/${city.slug}`);
  // openGraph.title isn't run through the root layout's title template, so
  // spell out the " | FindMyTruck" suffix here to match the <title> tag.
  const ogTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      ...OG_LOCALE_DEFAULTS,
      title: ogTitle,
      description,
      url,
      type: "website",
    },
    twitter: { card: "summary_large_image", title: ogTitle, description },
  };
}
