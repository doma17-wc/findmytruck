"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeMenuItems, type MenuItem } from "@/lib/menu";
import { geocode } from "@/lib/geocode";
import { getMondayFirstDay } from "@/lib/geo";
import { DEFAULT_MAP_CENTER } from "@/lib/cities";
import { PHOTO_BUCKET, storagePathFromPublicUrl } from "@/lib/storage";
import type { ScheduleFrequency } from "@/lib/types";

async function requireOwnTruckId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("truck_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "truck_owner" || !profile.truck_id) {
    throw new Error("No truck linked to this account");
  }
  return profile.truck_id;
}

export interface ActionResult {
  error?: string;
  success?: boolean;
}

function revalidateEverywhere() {
  revalidatePath("/dashboard");
  revalidatePath("/");
  revalidatePath("/trucks/[slug]", "page");
}

/* ------------------------------------------------------------------ *
 * SETTINGS  (truck profile fields + publish toggle)
 * ------------------------------------------------------------------ */

export async function saveSettingsAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const truckId = await requireOwnTruckId();
  const supabase = createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const csv = (key: string) =>
    String(formData.get(key) ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const payload = {
    name,
    description: String(formData.get("description") ?? "") || null,
    cuisine_type: csv("cuisine_type"),
    price_range: String(formData.get("price_range") ?? "") || null,
    logo_url: String(formData.get("logo_url") ?? "") || null,
    // cover_photo_url is owned by the photo gallery (synced by syncCoverPhoto,
    // see the PHOTOS section below) — never overwritten from this form.
    instagram: String(formData.get("instagram") ?? "") || null,
    tiktok: String(formData.get("tiktok") ?? "") || null,
    website: String(formData.get("website") ?? "") || null,
    phone: String(formData.get("phone") ?? "") || null,
    languages: csv("languages"),
    food_type: csv("food_type"),
    dietary_options: csv("dietary_options"),
    payment_methods: csv("payment_methods"),
    features: csv("features"),
    is_active: formData.get("is_active") === "on",
  };

  const { error } = await supabase.from("trucks").update(payload).eq("id", truckId);
  if (error) return { error: error.message };

  revalidateEverywhere();
  return { success: true };
}

/* ------------------------------------------------------------------ *
 * MENU  (inline editor -> trucks.menu_items jsonb)
 * ------------------------------------------------------------------ */

export async function saveMenuAction(items: unknown): Promise<ActionResult> {
  const truckId = await requireOwnTruckId();
  const supabase = createClient();

  const menuItems: MenuItem[] = normalizeMenuItems(items);

  const { error } = await supabase
    .from("trucks")
    .update({ menu_items: menuItems })
    .eq("id", truckId);
  if (error) return { error: error.message };

  revalidateEverywhere();
  return { success: true };
}

/* ------------------------------------------------------------------ *
 * TOUR SCHEDULE  (7-day form -> truck_schedules, geocoded server-side)
 * ------------------------------------------------------------------ */

export interface TourDayInput {
  day: number; // 0 = Mon .. 6 = Sun
  location: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  open: boolean;
  /** Coordinates already known for this location (skip re-geocoding). */
  lat: number | null;
  lng: number | null;
  /** How often this day repeats. Defaults to "weekly" (every week, unchanged). */
  frequency: ScheduleFrequency;
  /** Only used when frequency = "alternate". */
  frequencyParity: "even" | "odd" | null;
  /** Only used when frequency = "monthly_weeks" -- which occurrence(s) (1-4). */
  frequencyWeeks: number[] | null;
}

/** Clamp a "HH:MM" (or "H:MM") string to a valid 24h time, default on garbage input. */
function clampTime(raw: string, fallback: string): string {
  const m = (raw ?? "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return fallback;
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const mm = Math.min(59, Math.max(0, Number(m[2])));
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export async function publishTourAction(days: TourDayInput[]): Promise<ActionResult> {
  const truckId = await requireOwnTruckId();
  const supabase = createClient();

  const rows: {
    truck_id: string;
    day_of_week: number;
    location_name: string;
    location_lat: number;
    location_lng: number;
    start_time: string;
    end_time: string;
    is_recurring: boolean;
    frequency: ScheduleFrequency;
    frequency_parity: "even" | "odd" | null;
    frequency_weeks: number[] | null;
  }[] = [];

  for (const d of days) {
    const location = (d.location ?? "").trim();
    if (!d.open || !location) continue;

    let lat = typeof d.lat === "number" && Number.isFinite(d.lat) ? d.lat : null;
    let lng = typeof d.lng === "number" && Number.isFinite(d.lng) ? d.lng : null;

    if (lat === null || lng === null) {
      const geo = await geocode(location);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
      } else {
        // Ambiguous / not found -> drop a pin at the country's default centre so
        // the truck still shows on the map. Owner can refine later.
        lat = DEFAULT_MAP_CENTER[1];
        lng = DEFAULT_MAP_CENTER[0];
      }
    }

    const frequency: ScheduleFrequency = ["weekly", "alternate", "monthly_weeks"].includes(
      d.frequency
    )
      ? d.frequency
      : "weekly";

    rows.push({
      truck_id: truckId,
      day_of_week: Math.min(6, Math.max(0, Math.round(d.day))),
      location_name: location,
      location_lat: lat,
      location_lng: lng,
      start_time: clampTime(d.startTime, "11:00"),
      end_time: clampTime(d.endTime, "14:00"),
      is_recurring: true,
      frequency,
      frequency_parity: frequency === "alternate" ? d.frequencyParity ?? "odd" : null,
      frequency_weeks:
        frequency === "monthly_weeks"
          ? (d.frequencyWeeks ?? []).filter((w) => w >= 1 && w <= 4)
          : null,
    });
  }

  // Replace the whole recurring tour. The live-pitch row (specific_date set) is
  // left untouched so an in-progress "Go live" session survives a re-publish.
  const { error: delError } = await supabase
    .from("truck_schedules")
    .delete()
    .eq("truck_id", truckId)
    .is("specific_date", null);
  if (delError) return { error: delError.message };

  if (rows.length > 0) {
    const { error: insError } = await supabase.from("truck_schedules").insert(rows);
    if (insError) return { error: insError.message };
  }

  revalidateEverywhere();
  return { success: true };
}

/* ------------------------------------------------------------------ *
 * BOOST  (trucks.boosted + boost_expires_at, optional GPS pin)
 *
 * Boosting pushes the truck to the top of the map and marks it "confirmed live
 * right now". It auto-expires at the end of today's scheduled slot (or in 4h if
 * there's no active slot) — "boosted" is re-checked on read, so no cron needed.
 * ------------------------------------------------------------------ */

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

export interface BoostInput {
  /** Optional GPS captured with the owner's permission to refine the pin. */
  lat: number | null;
  lng: number | null;
}

export async function boostAction(input: BoostInput): Promise<ActionResult> {
  const truckId = await requireOwnTruckId();
  const supabase = createClient();

  const now = new Date();

  // Expiry = end of today's active recurring slot, else +4h.
  const { data: rows } = await supabase
    .from("truck_schedules")
    .select("day_of_week, start_time, end_time, specific_date")
    .eq("truck_id", truckId)
    .is("specific_date", null);

  const todayIdx = getMondayFirstDay(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const active = (rows ?? []).find(
    (s) =>
      s.day_of_week === todayIdx &&
      s.start_time !== s.end_time &&
      nowMin >= toMin(s.start_time) &&
      nowMin <= toMin(s.end_time)
  );

  let expires = new Date(now.getTime() + FOUR_HOURS_MS);
  if (active) {
    const [h, m] = active.end_time.split(":").map(Number);
    const slotEnd = new Date(now);
    slotEnd.setHours(h || 0, m || 0, 0, 0);
    if (slotEnd > now) expires = slotEnd;
  }

  const lat = typeof input.lat === "number" && Number.isFinite(input.lat) ? input.lat : null;
  const lng = typeof input.lng === "number" && Number.isFinite(input.lng) ? input.lng : null;

  const { error } = await supabase
    .from("trucks")
    .update({
      boosted: true,
      boost_started_at: now.toISOString(),
      boost_expires_at: expires.toISOString(),
      boost_lat: lat,
      boost_lng: lng,
      is_active: true,
    })
    .eq("id", truckId);
  if (error) return { error: error.message };

  revalidateEverywhere();
  return { success: true };
}

export async function endBoostAction(): Promise<ActionResult> {
  const truckId = await requireOwnTruckId();
  const supabase = createClient();

  const { error } = await supabase
    .from("trucks")
    .update({
      boosted: false,
      boost_expires_at: null,
      boost_started_at: null,
      boost_lat: null,
      boost_lng: null,
    })
    .eq("id", truckId);
  if (error) return { error: error.message };

  revalidateEverywhere();
  return { success: true };
}

/* ------------------------------------------------------------------ *
 * REVIEWS
 * ------------------------------------------------------------------ */

export async function replyToReviewAction(reviewId: string, reply: string): Promise<ActionResult> {
  const truckId = await requireOwnTruckId();
  const supabase = createClient();

  const { error } = await supabase
    .from("reviews")
    .update({ reply: reply.trim() || null })
    .eq("id", reviewId)
    .eq("truck_id", truckId);
  if (error) return { error: error.message };

  revalidateEverywhere();
  return { success: true };
}

/* ------------------------------------------------------------------ *
 * PHOTOS  (one unified gallery — the first photo is always the cover;
 * trucks.cover_photo_url is kept in sync so every existing reader — map
 * pins, DetailSheet hero, JSON-LD, OG image — needs no changes.)
 * ------------------------------------------------------------------ */

type SupabaseServer = ReturnType<typeof createClient>;

async function syncCoverPhoto(supabase: SupabaseServer, truckId: string) {
  const { data: first } = await supabase
    .from("truck_photos")
    .select("url")
    .eq("truck_id", truckId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("trucks")
    .update({ cover_photo_url: first?.url ?? null })
    .eq("id", truckId);
}

export async function addOwnPhotoAction(url: string, caption: string) {
  const truckId = await requireOwnTruckId();
  const supabase = createClient();

  const { count } = await supabase
    .from("truck_photos")
    .select("id", { count: "exact", head: true })
    .eq("truck_id", truckId);

  await supabase.from("truck_photos").insert({
    truck_id: truckId,
    url,
    caption: caption || null,
    sort_order: count ?? 0,
  });

  await syncCoverPhoto(supabase, truckId);
  revalidateEverywhere();
}

export async function deleteOwnPhotoAction(photoId: string) {
  const truckId = await requireOwnTruckId();
  const supabase = createClient();

  const { data: row } = await supabase
    .from("truck_photos")
    .select("url")
    .eq("id", photoId)
    .eq("truck_id", truckId)
    .maybeSingle();

  await supabase.from("truck_photos").delete().eq("id", photoId).eq("truck_id", truckId);

  const path = storagePathFromPublicUrl(row?.url);
  if (path) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  }

  await syncCoverPhoto(supabase, truckId);
  revalidateEverywhere();
}

export async function reorderOwnPhotosAction(orderedIds: string[]) {
  const truckId = await requireOwnTruckId();
  const supabase = createClient();

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("truck_photos").update({ sort_order: index }).eq("id", id).eq("truck_id", truckId)
    )
  );

  await syncCoverPhoto(supabase, truckId);
  revalidateEverywhere();
}

/* ------------------------------------------------------------------ *
 * EVENTS  (one-off dated appearances, separate from the weekly schedule —
 * an owner's event always auto-links to their own truck via event_trucks.)
 * ------------------------------------------------------------------ */

export interface EventInput {
  name: string;
  description: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;
  startTime: string; // "HH:MM"
  endTime: string;
  location: string;
  lat: number | null;
  lng: number | null;
  link: string;
}

function revalidateEvents() {
  revalidateEverywhere();
  revalidatePath("/events");
}

export async function saveOwnEventAction(
  eventId: string | null,
  input: EventInput
): Promise<ActionResult> {
  const truckId = await requireOwnTruckId();
  const supabase = createClient();

  const name = input.name.trim();
  const location = input.location.trim();
  if (!name) return { error: "Event name is required." };
  if (!location) return { error: "Location is required." };
  if (!input.startDate || !input.endDate) return { error: "Start and end date are required." };
  if (input.endDate < input.startDate) return { error: "End date can't be before the start date." };

  let lat = typeof input.lat === "number" && Number.isFinite(input.lat) ? input.lat : null;
  let lng = typeof input.lng === "number" && Number.isFinite(input.lng) ? input.lng : null;
  if (lat === null || lng === null) {
    const geo = await geocode(location);
    if (geo) {
      lat = geo.lat;
      lng = geo.lng;
    } else {
      lat = DEFAULT_MAP_CENTER[1];
      lng = DEFAULT_MAP_CENTER[0];
    }
  }

  const payload = {
    name,
    description: input.description.trim() || null,
    start_date: input.startDate,
    end_date: input.endDate,
    start_time: input.startTime ? clampTime(input.startTime, "11:00") : null,
    end_time: input.endTime ? clampTime(input.endTime, "18:00") : null,
    location_name: location,
    location_lat: lat,
    location_lng: lng,
    link: input.link.trim() || null,
    created_by_truck_id: truckId,
  };

  if (eventId) {
    const { error } = await supabase
      .from("events")
      .update(payload)
      .eq("id", eventId)
      .eq("created_by_truck_id", truckId);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase.from("events").insert(payload).select("id").single();
    if (error) return { error: error.message };
    const { error: linkError } = await supabase
      .from("event_trucks")
      .insert({ event_id: data.id, truck_id: truckId });
    if (linkError) return { error: linkError.message };
  }

  revalidateEvents();
  return { success: true };
}

export async function deleteOwnEventAction(eventId: string): Promise<ActionResult> {
  const truckId = await requireOwnTruckId();
  const supabase = createClient();

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("created_by_truck_id", truckId);
  if (error) return { error: error.message };

  revalidateEvents();
  return { success: true };
}

/** Move one photo to the front (sort_order 0) — used by "Set as cover". */
export async function setCoverOwnPhotoAction(photoId: string) {
  const truckId = await requireOwnTruckId();
  const supabase = createClient();

  const { data: rows } = await supabase
    .from("truck_photos")
    .select("id")
    .eq("truck_id", truckId)
    .order("sort_order", { ascending: true });

  const ordered = (rows ?? []).map((r) => r.id);
  const idx = ordered.indexOf(photoId);
  if (idx > 0) {
    ordered.splice(idx, 1);
    ordered.unshift(photoId);
  }

  await Promise.all(
    ordered.map((id, index) =>
      supabase.from("truck_photos").update({ sort_order: index }).eq("id", id).eq("truck_id", truckId)
    )
  );

  await syncCoverPhoto(supabase, truckId);
  revalidateEverywhere();
}
