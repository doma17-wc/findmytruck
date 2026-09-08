"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { uploadTruckImage } from "@/lib/photoUpload";
import { cn } from "./ui";

/**
 * Square photo slot for one menu dish. Shows the thumbnail with a remove button,
 * or an upload affordance when empty. Resizes client-side before upload.
 */
export default function DishPhotoButton({
  truckId,
  url,
  onChange,
  size = "md",
}: {
  truckId: string;
  url: string | null;
  onChange: (url: string | null) => void;
  size?: "sm" | "md";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const box = size === "sm" ? "h-10 w-10" : "h-14 w-14";

  const pick = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Not an image");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const uploaded = await uploadTruckImage(truckId, file, "dish", 1000);
      onChange(uploaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex-shrink-0">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pick(f);
        }}
      />
      {url ? (
        <div className={cn("group relative overflow-hidden rounded-lg bg-paper-deep", box)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Dish" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove dish photo"
            className="absolute inset-0 flex items-center justify-center bg-ink/50 text-white opacity-0 transition group-hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Add dish photo"
          title="Add dish photo"
          className={cn(
            "flex items-center justify-center rounded-lg border border-dashed border-line text-muted transition hover:border-accent/40 hover:text-ink",
            box
          )}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        </button>
      )}
      {error && <p className="mt-0.5 text-[10px] text-red-600">{error}</p>}
    </div>
  );
}
