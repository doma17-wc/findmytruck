"use client";

import { useId, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/imageResize";
import { PHOTO_BUCKET, storagePathFromPublicUrl } from "@/lib/storage";

interface ImageDropzoneProps {
  /** Hidden input name — the resulting public URL is submitted with the form. */
  name: string;
  label: string;
  truckId: string;
  initialUrl: string | null;
  /** Preview aspect ratio. */
  aspect?: "square" | "wide";
  hint?: string;
}

export default function ImageDropzone({
  name,
  label,
  truckId,
  initialUrl,
  aspect = "wide",
  hint,
}: ImageDropzoneProps) {
  const [url, setUrl] = useState<string | null>(initialUrl || null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const deleteFromStorage = async (target: string | null) => {
    const path = storagePathFromPublicUrl(target);
    if (!path) return;
    try {
      await createClient().storage.from(PHOTO_BUCKET).remove([path]);
    } catch {
      /* best effort */
    }
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("That doesn't look like an image file.");
      return;
    }
    setError(null);
    setUploading(true);
    const previous = url;
    try {
      const supabase = createClient();
      const { blob, ext, contentType } = await resizeImage(file, 1600);
      const path = `${truckId}/${name}-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, blob, { cacheControl: "3600", upsert: false, contentType });
      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`);
        return;
      }
      const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
      setUrl(data.publicUrl);
      void deleteFromStorage(previous);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    void deleteFromStorage(url);
    setUrl(null);
    setError(null);
  };

  const aspectClass = aspect === "square" ? "aspect-square max-w-[10rem]" : "aspect-[16/9]";

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-neutral-700">{label}</span>
        {hint && <span className="text-xs text-neutral-400">{hint}</span>}
      </div>

      <input type="hidden" name={name} value={url ?? ""} />
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {url ? (
        <div className={`group relative w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 ${aspectClass}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="h-full w-full object-cover" />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-600" />
            </div>
          )}
          <div className="absolute right-1.5 top-1.5 flex gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg bg-black/60 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-black/75"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              aria-label={`Remove ${label}`}
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/75"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
          className={`flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${aspectClass} ${
            dragOver
              ? "border-brand bg-brand-50"
              : "border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100"
          }`}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
          ) : (
            <ImagePlus className="h-5 w-5 text-neutral-400" />
          )}
          <span className="text-xs font-medium text-neutral-500">
            {uploading ? "Uploading…" : "Drag an image here or tap to upload"}
          </span>
        </label>
      )}

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
