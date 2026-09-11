"use client";

import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/imageResize";
import { PHOTO_BUCKET } from "@/lib/storage";

/**
 * Resize + upload one image to the shared `truck-photos` bucket under a truck,
 * returning its public URL. `kind` is just a filename prefix so uploads are easy
 * to tell apart in storage ("gallery", "dish", …).
 */
export async function uploadTruckImage(
  truckId: string,
  file: File,
  kind: string,
  maxWidth = 2000
): Promise<string> {
  const supabase = createClient();
  const { blob, ext, contentType } = await resizeImage(file, maxWidth);
  const path = `${truckId}/${kind}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, { cacheControl: "3600", upsert: false, contentType });
  if (error) throw new Error(error.message);
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}
