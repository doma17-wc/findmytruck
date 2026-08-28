/**
 * Swiss city registry. Drives the /<city> browse pages and any map defaults.
 *
 * Only cities with a corresponding page under src/app/(site)/<slug>/ are actually
 * routable today (currently just Zurich), but the geocoder and map logic are
 * Switzerland-wide, so adding a new city here + a thin page is all that's needed.
 */
export interface City {
  slug: string;
  /** Display name, e.g. "Zurich" or "St. Gallen". */
  name: string;
  /** Map center as [lng, lat]. */
  center: [number, number];
}

export const CITIES: Record<string, City> = {
  zurich: { slug: "zurich", name: "Zurich", center: [8.5417, 47.3769] },
  bern: { slug: "bern", name: "Bern", center: [7.4474, 46.948] },
  basel: { slug: "basel", name: "Basel", center: [7.5886, 47.5596] },
  geneva: { slug: "geneva", name: "Geneva", center: [6.1432, 46.2044] },
  lausanne: { slug: "lausanne", name: "Lausanne", center: [6.6323, 46.5197] },
  lucerne: { slug: "lucerne", name: "Lucerne", center: [8.3093, 47.0502] },
  winterthur: { slug: "winterthur", name: "Winterthur", center: [8.7241, 47.5001] },
  "st-gallen": { slug: "st-gallen", name: "St. Gallen", center: [9.3767, 47.4245] },
};

/** Geographic center of Switzerland ([lng, lat]) — used as the map's fallback. */
export const SWITZERLAND_CENTER: [number, number] = [8.2275, 46.8182];

/** Default map center when the user has no location: Zurich. */
export const DEFAULT_MAP_CENTER: [number, number] = CITIES.zurich.center;

/** ISO country code for Mapbox geocoding — restrict searches to Switzerland. */
export const GEOCODE_COUNTRY = "ch";

export function getCity(slug: string): City | null {
  return CITIES[slug] ?? null;
}
