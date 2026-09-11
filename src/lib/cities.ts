/**
 * Swiss city registry. Drives the /<city> browse pages and any map defaults.
 *
 * Every city listed here can be given a routable page under
 * src/app/(site)/<slug>/page.tsx (a thin wrapper around
 * src/app/(site)/_city/CityPageView.tsx) — see ROUTABLE_CITY_SLUGS below for
 * which ones currently are. Adding a new one is: register it here, mark its
 * slug as routable, add the one-line page file.
 */
export interface City {
  slug: string;
  /** Display name, German-first (matches our Deutschschweiz audience). */
  name: string;
  /** Map center as [lng, lat]. */
  center: [number, number];
}

export const CITIES: Record<string, City> = {
  zurich: { slug: "zurich", name: "Zürich", center: [8.5417, 47.3769] },
  zug: { slug: "zug", name: "Zug", center: [8.5154, 47.1662] },
  luzern: { slug: "luzern", name: "Luzern", center: [8.3093, 47.0502] },
  bern: { slug: "bern", name: "Bern", center: [7.4474, 46.948] },
  basel: { slug: "basel", name: "Basel", center: [7.5886, 47.5596] },
  winterthur: { slug: "winterthur", name: "Winterthur", center: [8.7241, 47.5001] },
  "st-gallen": { slug: "st-gallen", name: "St. Gallen", center: [9.3767, 47.4245] },
  lausanne: { slug: "lausanne", name: "Lausanne", center: [6.6323, 46.5197] },
  geneva: { slug: "geneva", name: "Genf", center: [6.1432, 46.2044] },
};

/** Cities in display order for pickers / browse chips. */
export const CITY_LIST: City[] = Object.values(CITIES);

/** Slugs with a real page at src/app/(site)/<slug>/page.tsx — used to build the
 *  sitemap and any "browse by city" navigation. Deutschschweiz first. */
export const ROUTABLE_CITY_SLUGS: string[] = [
  "zurich",
  "bern",
  "basel",
  "luzern",
  "zug",
  "winterthur",
  "st-gallen",
];

/** Geographic center of Switzerland ([lng, lat]) — used as the map's fallback. */
export const SWITZERLAND_CENTER: [number, number] = [8.2275, 46.8182];

/** Default map center when the user has no location: Zurich. */
export const DEFAULT_MAP_CENTER: [number, number] = CITIES.zurich.center;

/** ISO country code for Mapbox geocoding — restrict searches to Switzerland. */
export const GEOCODE_COUNTRY = "ch";

export function getCity(slug: string): City | null {
  return CITIES[slug] ?? null;
}
