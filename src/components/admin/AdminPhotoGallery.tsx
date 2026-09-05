"use client";

import { supabase } from "@/lib/supabase";
import { resizeImage } from "@/lib/imageResize";
import { PHOTO_BUCKET, storagePathFromPublicUrl } from "@/lib/storage";
import type { TruckPhoto } from "@/lib/types";
import {
  addPhotoAction,
  deletePhotoAction,
  reorderPhotoAction,
  setCoverPhotoAction,
} from "@/app/admin/actions";
import PhotoGalleryManager from "@/components/shared/PhotoGalleryManager";

async function uploadToStorage(truckId: string, file: File): Promise<string> {
  const { blob, ext, contentType } = await resizeImage(file, 1600);
  const path = `${truckId}/gallery-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, { cacheControl: "3600", upsert: false, contentType });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function removeFromStorage(url: string) {
  const path = storagePathFromPublicUrl(url);
  if (!path) return;
  await supabase.storage.from(PHOTO_BUCKET).remove([path]);
}

export default function AdminPhotoGallery({
  truckId,
  photos,
}: {
  truckId: string;
  photos: TruckPhoto[];
}) {
  return (
    <PhotoGalleryManager
      truckId={truckId}
      photos={photos}
      uploadToStorage={uploadToStorage}
      removeFromStorage={removeFromStorage}
      onAdd={(url) => addPhotoAction(truckId, url, "")}
      onDelete={(id) => deletePhotoAction(truckId, id)}
      onReorder={(ids) => reorderPhotoAction(truckId, ids)}
      onSetCover={(id) => setCoverPhotoAction(truckId, id)}
    />
  );
}
