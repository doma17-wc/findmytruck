import { GEOCODE_COUNTRY } from "./cities";

export interface GeocodeResult {
  lat: number;
  lng: number;
  name: string;
}

/**
 * Best-effort forward geocoding, restricted to Switzerland. Returns the single
 * best match, or null when nothing is found / the request fails. Safe to call
 * from the server (uses the public Mapbox token).
 */
export async function geocode(query: string): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    q
  )}.json?access_token=${token}&country=${GEOCODE_COUNTRY}&limit=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const feature = json.features?.[0];
    if (!feature?.center) return null;
    return {
      lat: feature.center[1],
      lng: feature.center[0],
      name: typeof feature.place_name === "string" ? feature.place_name.split(",")[0] : q,
    };
  } catch {
    return null;
  }
}
