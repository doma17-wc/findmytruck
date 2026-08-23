"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import type { TruckPhoto } from "@/lib/types";
import { addPhotoAction, deletePhotoAction } from "@/app/admin/actions";

const BUCKET = "truck-photos";

export default function PhotoUploader({
  truckId,
  photos,
}: {
  truckId: string;
  photos: TruckPhoto[];
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${truckId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) {
        alert(`Upload failed: ${uploadError.message}`);
        return;
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      await addPhotoAction(truckId, data.publicUrl, "");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
            <Image src={photo.url} alt={photo.caption ?? ""} fill className="object-cover" />
            <button
              onClick={() => deletePhotoAction(truckId, photo.id)}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
              aria-label="Delete photo"
            >
              ×
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 text-sm text-neutral-500 disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "+ Add photo"}
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
