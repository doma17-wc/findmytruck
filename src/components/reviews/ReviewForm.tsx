"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/imageResize";
import { PHOTO_BUCKET, storagePathFromPublicUrl } from "@/lib/storage";
import { submitReviewAction } from "@/app/(site)/review-actions";
import { StarInput } from "./Stars";

interface ReviewFormProps {
  truckId: string;
  truckName: string;
  signedIn: boolean;
  /** When true and the visitor is signed out, the form asks them to log in. */
  requireLogin: boolean;
  onDone: () => void;
}

export default function ReviewForm({
  truckId,
  truckName,
  signedIn,
  requireLogin,
  onDone,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  if (requireLogin && !signedIn) {
    return (
      <div className="rounded-2xl border border-line bg-card p-5 text-sm text-ink-soft">
        <p className="font-semibold text-ink">Log in to review {truckName}</p>
        <p className="mt-1 text-muted">Reviews are limited to signed-in customers right now.</p>
        <button
          type="button"
          onClick={() =>
            router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`)
          }
          className="mt-3 inline-block rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white"
        >
          Log in
        </button>
      </div>
    );
  }

  const removePhoto = () => {
    const path = storagePathFromPublicUrl(photoUrl);
    if (path) void createClient().storage.from(PHOTO_BUCKET).remove([path]).catch(() => {});
    setPhotoUrl(null);
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("That doesn't look like an image.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const { blob, ext, contentType } = await resizeImage(file, 1400);
      const path = `reviews/${truckId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, blob, { cacheControl: "3600", upsert: false, contentType });
      if (upErr) {
        setError(`Photo upload failed: ${upErr.message}`);
        return;
      }
      const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = () => {
    setError(null);
    if (rating < 1) {
      setError("Please pick a star rating.");
      return;
    }
    startTransition(async () => {
      const res = await submitReviewAction({
        truckId,
        rating,
        text,
        photoUrl,
        name,
        website,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setDone(true);
      setTimeout(onDone, 1400);
    });
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-live/30 bg-live/5 p-5 text-center text-sm font-semibold text-live">
        Thanks for reviewing {truckName}! 🌮
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-paper">
      <p className="font-display text-base font-bold text-ink">Review {truckName}</p>

      <div className="mt-3">
        <span className="mb-1.5 block text-sm font-semibold text-ink">Your rating *</span>
        <StarInput value={rating} onChange={setRating} />
      </div>

      {!signedIn && (
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Your name *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="e.g. Sam"
            className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[15px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
      )}

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">Review (optional)</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="How was the food, the service, the wait?"
          className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[15px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </label>

      <div className="mt-4">
        <span className="mb-1.5 block text-sm font-semibold text-ink">Dish photo (optional)</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        {photoUrl ? (
          <div className="relative h-40 w-40 overflow-hidden rounded-xl border border-line bg-paper-deep">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="Your dish" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={removePhoto}
              aria-label="Remove photo"
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-black/60 text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex h-24 w-40 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line bg-paper-deep/40 text-xs font-medium text-muted transition hover:border-brand-300"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            {uploading ? "Uploading…" : "Add a photo"}
          </button>
        )}
      </div>

      {/* Honeypot — visually hidden, ignored by real users. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {error && <p className="mt-3 text-sm font-medium text-accent-dark">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending || uploading}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Post review
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
