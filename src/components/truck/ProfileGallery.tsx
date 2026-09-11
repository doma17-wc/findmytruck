"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import TruckPlaceholder from "@/components/site/TruckPlaceholder";

interface ProfileGalleryProps {
  images: string[];
  name: string;
  /** "sheet" = slide-over height, "page" = cinematic full-bleed. */
  variant?: "sheet" | "page";
  overlayTopLeft?: ReactNode;
  overlayTopRight?: ReactNode;
  /** Fired when a photo is opened full-size (lightbox), 0-indexed. */
  onPhotoOpen?: (index: number) => void;
}

/**
 * Edge-to-edge photo carousel used as the hero on both customer profile
 * surfaces. Native CSS scroll-snap for buttery mobile swipe; arrows, drag,
 * mouse-wheel and a tap-to-zoom lightbox for desktop.
 */
export default function ProfileGallery({
  images,
  name,
  variant = "sheet",
  overlayTopLeft,
  overlayTopRight,
  onPhotoOpen,
}: ProfileGalleryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const heightClass =
    variant === "page"
      ? "h-[54vh] min-h-[300px] max-h-[560px] sm:h-[64vh] sm:max-h-[640px] lg:h-[420px] lg:max-h-[420px]"
      : "h-72 sm:h-80";
  const roundedClass = variant === "page" ? "lg:rounded-3xl" : "";
  const sizes =
    variant === "page" ? "(min-width: 1024px) 1180px, 100vw" : "(max-width: 640px) 100vw, 460px";
  // The full page lifts a rounded panel ~20px over the hero on mobile — keep controls clear of it.
  // On desktop the hero is a standalone contained banner, so controls sit at the natural edge.
  const controlsBottom = variant === "page" ? "bottom-7 lg:bottom-3" : "bottom-3";

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setActiveIdx(Math.round(el.scrollLeft / el.clientWidth));
  };

  const scrollToIndex = (i: number) => {
    const el = scrollRef.current;
    if (!el || images.length === 0) return;
    const clamped = (i + images.length) % images.length;
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  };

  // Desktop mouse-drag-to-pan (touch pointers keep native swipe untouched).
  const dragRef = useRef<{ startX: number; startScroll: number; moved: boolean } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch" || images.length < 2) return;
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = { startX: e.clientX, startScroll: el.scrollLeft, moved: false };
    setIsDragging(true);
    el.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    const el = scrollRef.current;
    if (!state || !el) return;
    const dx = e.clientX - state.startX;
    if (Math.abs(dx) > 4) state.moved = true;
    el.scrollLeft = state.startScroll - dx;
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state) return;
    dragRef.current = null;
    setIsDragging(false);
    const el = scrollRef.current;
    if (el && el.clientWidth > 0) scrollToIndex(Math.round(el.scrollLeft / el.clientWidth));
    try {
      el?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  // Vertical wheel / trackpad drives the horizontal carousel on desktop.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || images.length < 2) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [images.length]);

  // Lightbox keyboard nav.
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((i) => (i === null ? i : (i + 1) % images.length));
      if (e.key === "ArrowLeft")
        setLightbox((i) => (i === null ? i : (i - 1 + images.length) % images.length));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox, images.length]);

  return (
    <div className={`group relative flex-shrink-0 overflow-hidden bg-paper-deep ${heightClass} ${roundedClass}`}>
      {images.length > 0 ? (
        <div
          ref={scrollRef}
          onScroll={onScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDragStart={(e) => e.preventDefault()}
          className={`no-scrollbar flex h-full w-full select-none snap-x snap-mandatory overflow-x-auto ${
            isDragging ? "cursor-grabbing" : images.length > 1 ? "scroll-smooth cursor-grab" : ""
          }`}
        >
          {images.map((src, i) => (
            <button
              type="button"
              key={src + i}
              onClick={() => {
                if (!dragRef.current?.moved) {
                  setLightbox(i);
                  onPhotoOpen?.(i);
                }
              }}
              className="relative h-full w-full flex-shrink-0 snap-center"
              aria-label={`View ${name} photo ${i + 1} full size`}
            >
              <Image
                src={src}
                alt={`${name} photo ${i + 1}`}
                fill
                priority={i === 0}
                draggable={false}
                className="pointer-events-none object-cover"
                sizes={sizes}
                quality={90}
              />
            </button>
          ))}
        </div>
      ) : (
        <TruckPlaceholder name={name} />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/5 to-ink/15" />

      {overlayTopLeft && <div className="absolute left-3 top-3 z-10 sm:left-4 sm:top-4">{overlayTopLeft}</div>}
      {overlayTopRight && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2 sm:right-4 sm:top-4">
          {overlayTopRight}
        </div>
      )}

      {images.length > 0 && (
        <span className={`pointer-events-none absolute ${controlsBottom} right-3 z-10 flex items-center gap-1 rounded-full bg-ink/55 px-2 py-1 text-[11px] font-bold text-white backdrop-blur-sm`}>
          <Expand className="h-3 w-3" />
          {activeIdx + 1}/{images.length}
        </span>
      )}

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollToIndex(activeIdx - 1)}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 shadow-md backdrop-blur-sm transition hover:bg-white active:scale-95 group-hover:opacity-100 sm:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex(activeIdx + 1)}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 shadow-md backdrop-blur-sm transition hover:bg-white active:scale-95 group-hover:opacity-100 sm:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className={`absolute inset-x-0 ${controlsBottom} z-10 flex items-center justify-center gap-1.5`}>
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToIndex(i)}
                aria-label={`Go to photo ${i + 1}`}
                aria-current={i === activeIdx}
                className="flex h-4 w-4 items-center justify-center"
              >
                <span
                  className={`h-1.5 rounded-full shadow-sm transition-all ${
                    i === activeIdx ? "w-4 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80"
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}

      {lightbox !== null && images[lightbox] && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="relative h-full max-h-[85vh] w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[lightbox]}
              alt={`${name} photo ${lightbox + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              quality={95}
            />
          </div>
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((i) => (i === null ? i : (i - 1 + images.length) % images.length));
                }}
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((i) => (i === null ? i : (i + 1) % images.length));
                }}
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
