"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleFavoriteAction } from "@/app/(site)/favorites-actions";

interface FavoriteButtonProps {
  truckId: string;
  initialFavorited: boolean;
  signedIn: boolean;
  size?: "sm" | "md";
  /** "icon" = round heart button (default). "pill" = heart + Follow/Following label. */
  variant?: "icon" | "pill";
}

export default function FavoriteButton({
  truckId,
  initialFavorited,
  signedIn,
  size = "md",
  variant = "icon",
}: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const dims = size === "sm" ? "h-8 w-8" : "h-11 w-11";
  const iconDims = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const next = !favorited;
    setFavorited(next);
    startTransition(async () => {
      try {
        await toggleFavoriteAction(truckId, favorited);
      } catch {
        setFavorited(!next);
      }
    });
  };

  if (variant === "pill") {
    return (
      <button
        type="button"
        aria-pressed={favorited}
        disabled={isPending}
        onClick={toggle}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-70 ${
          favorited
            ? "bg-brand text-white hover:bg-brand-600"
            : "border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
        }`}
      >
        <Heart
          className="h-4 w-4"
          fill={favorited ? "currentColor" : "none"}
          strokeWidth={2}
        />
        {favorited ? "Following" : "Follow"}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={favorited ? "Unfollow this truck" : "Follow this truck"}
      aria-pressed={favorited}
      disabled={isPending}
      onClick={toggle}
      className={`flex ${dims} flex-shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition hover:scale-105 active:scale-95 disabled:opacity-70`}
    >
      <Heart
        className={iconDims}
        color={favorited ? "#FF6A00" : "#525252"}
        fill={favorited ? "#FF6A00" : "none"}
        strokeWidth={2}
      />
    </button>
  );
}
