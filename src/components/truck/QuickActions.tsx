"use client";

import { useState } from "react";
import { Check, Globe, Music2, Navigation, Share2 } from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";
import FavoriteButton from "@/components/FavoriteButton";

interface QuickActionsProps {
  truckId: string;
  favorited: boolean;
  signedIn: boolean;
  isOwnerView: boolean;
  directionsUrl?: string | null;
  shareUrl: string;
  shareTitle: string;
  instagram?: string | null;
  tiktok?: string | null;
  website?: string | null;
}

function socialUrl(kind: "instagram" | "tiktok", handle: string): string {
  if (handle.startsWith("http")) return handle;
  const h = handle.replace(/^@/, "");
  return kind === "instagram" ? `https://instagram.com/${h}` : `https://tiktok.com/@${h}`;
}

const iconBtn =
  "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-line bg-card text-ink-soft transition hover:border-brand hover:text-brand";

/**
 * The row of primary customer actions near the top of a truck profile:
 * Follow · Get directions · Share · Instagram / TikTok / website.
 */
export default function QuickActions({
  truckId,
  favorited,
  signedIn,
  isOwnerView,
  directionsUrl,
  shareUrl,
  shareTitle,
  instagram,
  tiktok,
  website,
}: QuickActionsProps) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const data = { title: shareTitle, text: `${shareTitle} on FindMyTruck`, url: shareUrl };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(data);
        return;
      }
    } catch {
      return; // user dismissed the share sheet
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — nothing else we can do */
    }
  };

  const websiteHref = website
    ? website.startsWith("http")
      ? website
      : `https://${website}`
    : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isOwnerView && (
        <FavoriteButton
          truckId={truckId}
          initialFavorited={favorited}
          signedIn={signedIn}
          variant="pill"
        />
      )}

      {directionsUrl && (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand/30 transition hover:brightness-105 active:scale-[0.99] sm:flex-none"
        >
          <Navigation className="h-4 w-4" />
          Directions
        </a>
      )}

      <button
        type="button"
        onClick={share}
        aria-label="Share this profile"
        className={iconBtn}
      >
        {copied ? <Check className="h-5 w-5 text-live" /> : <Share2 className="h-5 w-5" />}
      </button>

      {instagram && (
        <a
          href={socialUrl("instagram", instagram)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className={iconBtn}
        >
          <InstagramIcon className="h-5 w-5" />
        </a>
      )}
      {tiktok && (
        <a
          href={socialUrl("tiktok", tiktok)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="TikTok"
          className={iconBtn}
        >
          <Music2 className="h-5 w-5" />
        </a>
      )}
      {websiteHref && (
        <a
          href={websiteHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Website"
          className={iconBtn}
        >
          <Globe className="h-5 w-5" />
        </a>
      )}

      {copied && (
        <span className="text-[12px] font-semibold text-live" role="status">
          Link copied
        </span>
      )}
    </div>
  );
}
