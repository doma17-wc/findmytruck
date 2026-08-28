export const PHOTO_BUCKET = "truck-photos";

/**
 * Extract the in-bucket object path from a Supabase public storage URL, e.g.
 *   https://xxx.supabase.co/storage/v1/object/public/truck-photos/<truckId>/<file>.webp
 *   -> "<truckId>/<file>.webp"
 * Returns null for URLs that aren't in our bucket (e.g. pasted external links).
 */
export function storagePathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/${PHOTO_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return url.slice(i + marker.length).split("?")[0] || null;
}
