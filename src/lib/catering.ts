/**
 * Catering feature shared helpers (safe to import from both client and server).
 *
 * Stored on `trucks.catering_*` (migration 0016) -- catering_offerings and
 * catering_photos are ordered JSON arrays, same "small jsonb column, no extra
 * table" convention as trucks.menu_items (see src/lib/menu.ts).
 */
import type { PublicTruck } from "./types";

export interface CateringOffering {
  name: string;
  description: string | null;
  /** Free text -- "CHF 15 / person", "on request", etc. Never parsed as a number. */
  price: string | null;
}

export interface CateringPhoto {
  id: string;
  url: string;
  caption: string | null;
}

/** Coerce arbitrary DB / form JSON into a clean CateringOffering[] (drops empty rows). */
export function normalizeCateringOfferings(raw: unknown): CateringOffering[] {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry): CateringOffering | null => {
      if (!entry || typeof entry !== "object") return null;
      const o = entry as Record<string, unknown>;
      const name = typeof o.name === "string" ? o.name.trim() : "";
      if (!name) return null;
      const description =
        typeof o.description === "string" && o.description.trim() ? o.description.trim() : null;
      const price = typeof o.price === "string" && o.price.trim() ? o.price.trim() : null;
      return {
        name: name.slice(0, 120),
        description: description?.slice(0, 500) ?? null,
        price: price?.slice(0, 60) ?? null,
      };
    })
    .filter((x): x is CateringOffering => x !== null)
    .slice(0, 50);
}

/** Coerce arbitrary DB JSON into a clean CateringPhoto[] (drops rows with no url). */
export function normalizeCateringPhotos(raw: unknown): CateringPhoto[] {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry): CateringPhoto | null => {
      if (!entry || typeof entry !== "object") return null;
      const o = entry as Record<string, unknown>;
      const url = typeof o.url === "string" ? o.url.trim() : "";
      if (!url) return null;
      const id = typeof o.id === "string" && o.id ? o.id : url;
      const caption = typeof o.caption === "string" && o.caption.trim() ? o.caption.trim() : null;
      return { id, url, caption };
    })
    .filter((x): x is CateringPhoto => x !== null)
    .slice(0, 30);
}

/** True only once catering_available is explicitly set -- absent/false both mean "no". */
export function isCateringAvailable(truck: PublicTruck): boolean {
  return truck.catering_available === true;
}

/** "min–max guests" / "from min guests" / "up to max guests" -- null when both are blank. */
export function formatGuestRange(min: number | null | undefined, max: number | null | undefined): string | null {
  const lo = typeof min === "number" && Number.isFinite(min) && min > 0 ? min : null;
  const hi = typeof max === "number" && Number.isFinite(max) && max > 0 ? max : null;
  if (lo && hi) return `${lo}–${hi} guests`;
  if (lo) return `from ${lo} guests`;
  if (hi) return `up to ${hi} guests`;
  return null;
}

/** mailto: link with a prefilled subject/body -- direct contact, no FindMyTruck middleman. */
export function cateringMailto(email: string, truckName: string): string {
  const subject = encodeURIComponent(`Catering request — ${truckName}`);
  const body = encodeURIComponent(
    `Hi ${truckName},\n\nI'd like to ask about catering for an event. Here are the details:\n\n- Date:\n- Number of guests:\n- Location:\n\nThanks!`
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export function cateringTel(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
