"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { TruckPhoto } from "@/lib/types";
import { resizeImage } from "@/lib/imageResize";
import { PHOTO_BUCKET, storagePathFromPublicUrl } from "@/lib/storage";
import {
  addOwnPhotoAction,
  deleteOwnPhotoAction,
  reorderOwnPhotosAction,
} from "@/app/dashboard/actions";

export default function DashboardPhotoUploader({
  truckId,
  photos,
}: {
  truckId: string;
  photos: TruckPhoto[];
}) {
  const [items, setItems] = useState<TruckPhoto[]>(photos);
  const [uploading, setUploading] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-sync when the server sends a new list (after add / delete revalidation).
  const serverKey = photos.map((p) => p.id).join(",");
  useEffect(() => {
    setItems(photos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);

  const uploadOne = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const supabase = createClient();
    const { blob, ext, contentType } = await resizeImage(file, 1600);
    const path = `${truckId}/gallery-${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, blob, { cacheControl: "3600", upsert: false, contentType });
    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
      return;
    }
    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    await addOwnPhotoAction(data.publicUrl, "");
  };

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setError(null);
    setUploading((n) => n + list.length);
    for (const file of list) {
      try {
        await uploadOne(file);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const persistOrder = (next: TruckPhoto[]) => {
    setItems(next);
    void reorderOwnPhotosAction(next.map((p) => p.id));
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    persistOrder(next);
  };

  const handleDelete = async (photo: TruckPhoto) => {
    setItems((prev) => prev.filter((p) => p.id !== photo.id));
    await deleteOwnPhotoAction(photo.id);
    // storage object is cleaned up server-side; also try client-side as a fallback
    const path = storagePathFromPublicUrl(photo.url);
    if (path) {
      try {
        await createClient().storage.from(PHOTO_BUCKET).remove([path]);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-7 text-center transition ${
          dragOver
            ? "border-brand bg-brand-50"
            : "border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100"
        }`}
      >
        {uploading > 0 ? (
          <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
        ) : (
          <ImagePlus className="h-5 w-5 text-neutral-400" />
        )}
        <span className="text-xs font-medium text-neutral-500">
          {uploading > 0
            ? `Uploading ${uploading} photo${uploading === 1 ? "" : "s"}…`
            : "Drag photos here or tap to upload"}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
          }}
        />
      </label>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {items.length > 0 && (
        <>
          <p className="mt-3 text-xs text-neutral-400">Drag to reorder — first photo shows first on your profile.</p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {items.map((photo, idx) => (
              <div
                key={photo.id}
                draggable
                onDragStart={() => setDragFrom(idx)}
                onDragEnd={() => setDragFrom(null)}
                onDragOver={(e) => {
                  if (dragFrom === null || dragFrom === idx) return;
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragFrom !== null && dragFrom !== idx) move(dragFrom, idx);
                  setDragFrom(null);
                }}
                className={`group relative aspect-square overflow-hidden rounded-xl bg-neutral-100 ${
                  dragFrom === idx ? "opacity-40" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.caption ?? ""} className="h-full w-full cursor-grab object-cover active:cursor-grabbing" />

                <button
                  type="button"
                  onClick={() => void handleDelete(photo)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80"
                  aria-label="Delete photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => move(idx, idx - 1)}
                    disabled={idx === 0}
                    aria-label="Move earlier"
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-30"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, idx + 1)}
                    disabled={idx === items.length - 1}
                    aria-label="Move later"
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-30"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
