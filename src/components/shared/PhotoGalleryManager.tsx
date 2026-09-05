"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Star, X } from "lucide-react";
import { resizeImage } from "@/lib/imageResize";

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export interface GalleryPhoto {
  id: string;
  url: string;
  caption: string | null;
}

interface PhotoGalleryManagerProps {
  truckId: string;
  photos: GalleryPhoto[];
  /** Resize + upload one file to storage under this truck; returns the public URL. */
  uploadToStorage: (truckId: string, file: File) => Promise<string>;
  /** Best-effort client-side storage cleanup after a delete (server already removed it). */
  removeFromStorage?: (url: string) => Promise<void>;
  onAdd: (url: string) => Promise<void> | void;
  onDelete: (photoId: string) => Promise<void> | void;
  onReorder: (orderedIds: string[]) => Promise<void> | void;
  onSetCover: (photoId: string) => Promise<void> | void;
}

/**
 * One unified drag-and-drop photo gallery: multi-upload, drag-to-reorder,
 * "set as cover" (moves a photo to the front), delete. The FIRST photo is
 * always the cover — callers keep `trucks.cover_photo_url` in sync with it.
 */
export default function PhotoGalleryManager({
  truckId,
  photos,
  uploadToStorage,
  removeFromStorage,
  onAdd,
  onDelete,
  onReorder,
  onSetCover,
}: PhotoGalleryManagerProps) {
  const [items, setItems] = useState<GalleryPhoto[]>(photos);
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
    try {
      const url = await uploadToStorage(truckId, file);
      await onAdd(url);
    } catch (err) {
      setError(`Upload failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }
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

  const persistOrder = (next: GalleryPhoto[]) => {
    setItems(next);
    void onReorder(next.map((p) => p.id));
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    persistOrder(next);
  };

  const makeCover = (idx: number) => {
    if (idx === 0) return;
    const next = [...items];
    const [moved] = next.splice(idx, 1);
    next.unshift(moved);
    setItems(next);
    void onSetCover(items[idx].id);
  };

  const handleDelete = async (photo: GalleryPhoto) => {
    setItems((prev) => prev.filter((p) => p.id !== photo.id));
    await onDelete(photo.id);
    if (removeFromStorage) {
      try {
        await removeFromStorage(photo.url);
      } catch {
        /* best effort */
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
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-7 text-center transition",
          dragOver
            ? "border-brand bg-brand-50"
            : "border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100"
        )}
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
          <p className="mt-3 text-xs text-neutral-400">
            Drag to reorder, or tap the star to set a cover photo — the first photo shows first on your profile.
          </p>
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
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-xl bg-neutral-100",
                  dragFrom === idx && "opacity-40"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption ?? ""}
                  className="h-full w-full cursor-grab object-cover active:cursor-grabbing"
                />

                {idx === 0 ? (
                  <span className="absolute left-1 top-1 flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                    <Star className="h-3 w-3 fill-current" /> Cover
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => makeCover(idx)}
                    aria-label="Set as cover photo"
                    title="Set as cover photo"
                    className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition hover:bg-black/80 group-hover:opacity-100"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </button>
                )}

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
