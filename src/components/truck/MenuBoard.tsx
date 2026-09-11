"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { formatChf, groupMenu, MENU_DIETARY_TAGS, type MenuItem } from "@/lib/menu";
import { recordTruckContentView } from "@/lib/trackContentView";

function DietaryBadges({ ids }: { ids: MenuItem["dietary"] }) {
  if (!ids || ids.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {ids.map((id) => {
        const tag = MENU_DIETARY_TAGS.find((t) => t.id === id);
        if (!tag) return null;
        return (
          <span
            key={id}
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tag.className}`}
          >
            {tag.label}
          </span>
        );
      })}
    </div>
  );
}

function SoldOut() {
  return (
    <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-neutral-600">
      Sold out
    </span>
  );
}

/**
 * Appetite-forward menu board. Dishes with an owner-uploaded photo render as
 * rich cards with the image alongside; the rest fall back to a clean priced row.
 */
export default function MenuBoard({
  items,
  truckId,
  trackViews = false,
}: {
  items: MenuItem[];
  truckId?: string;
  /** Skip for the truck's own owner viewing their own profile. */
  trackViews?: boolean;
}) {
  const [zoom, setZoom] = useState<string | null>(null);
  const groups = groupMenu(items);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [zoom]);

  if (items.length === 0) return null;

  return (
    <div className="mt-3 space-y-5">
      {groups.map((group) => (
        <div key={group.category || "_"}>
          {group.category && (
            <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-muted">
              {group.category}
            </h3>
          )}
          <div className="space-y-2.5">
            {group.items.map((item, i) => {
              const price = formatChf(item.price);
              const hasPhoto = Boolean(item.photo_url);

              if (hasPhoto) {
                return (
                  <div
                    key={i}
                    className={`flex gap-3 overflow-hidden rounded-2xl border border-line bg-card p-2.5 shadow-paper ${
                      item.sold_out ? "opacity-60" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setZoom(item.photo_url!);
                        if (truckId) {
                          recordTruckContentView(truckId, "menu_item", item.name, !trackViews);
                        }
                      }}
                      className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-paper-deep sm:h-28 sm:w-28"
                      aria-label={`View photo of ${item.name}`}
                    >
                      <Image
                        src={item.photo_url!}
                        alt={item.name}
                        fill
                        sizes="112px"
                        quality={85}
                        className={`object-cover transition duration-300 hover:scale-105 ${
                          item.sold_out ? "grayscale" : ""
                        }`}
                      />
                    </button>
                    <div className="flex min-w-0 flex-1 flex-col py-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[15px] font-bold leading-tight text-ink">
                          {item.name}
                          {item.sold_out && <SoldOut />}
                        </p>
                        {price && (
                          <span className="flex-shrink-0 font-mono text-sm font-bold text-ink">
                            {price}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-soft">
                          {item.description}
                        </p>
                      )}
                      <DietaryBadges ids={item.dietary} />
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={i}
                  className={`rounded-xl px-1 ${item.sold_out ? "opacity-55" : ""}`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-[15px] font-semibold text-ink">
                      {item.name}
                      {item.sold_out && <SoldOut />}
                    </span>
                    <span className="mx-1 min-w-[1rem] flex-1 translate-y-[-3px] border-b border-dotted border-line" />
                    {price && (
                      <span className="flex-shrink-0 font-mono text-sm font-medium text-ink-soft">
                        {price}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                      {item.description}
                    </p>
                  )}
                  <DietaryBadges ids={item.dietary} />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {zoom && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/90 p-4"
          onClick={() => setZoom(null)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoom}
            alt=""
            className="max-h-[85vh] max-w-3xl rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
