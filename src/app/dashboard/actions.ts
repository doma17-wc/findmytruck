"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeMenuItems, type MenuItem } from "@/lib/menu";
import { geocode } from "@/lib/geocode";
import { getMondayFirstDay } from "@/lib/geo";
import { DEFAULT_MAP_CENTER } from "@/lib/cities";
import { PHOTO_BUCKET, storagePathFromPublicUrl } from "@/lib/storage";

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
    cover_photo_url: String(formData.get("cover_photo_url") ?? "") || null,
    menu_photo_url: String(formData.get("menu_photo_url") ?? "") || null,
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
  time: string; // "hh:mm-hh:mm"
  open: boolean;
  /** Coordinates already known for this location (skip re-geocoding). */
  lat: number | null;
  lng: number | null;
}

function parseTimeRange(raw: string): { start: string; end: string } {
  const m = raw.match(/(\d{1,2})[:.]?(\d{2})?\s*[-–—to]+\s*(\d{1,2})[:.]?(\d{2})?/);
  const pad = (h: string, mm?: string) =>
    `${String(Math.min(23, Math.max(0, Number(h)))).padStart(2, "0")}:${(mm ?? "00").padStart(2, "0")}`;
  if (!m) return { start: "11:00", end: "14:00" };
  return { start: pad(m[1], m[2]), end: pad(m[3], m[4]) };
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

    const { start, end } = parseTimeRange(d.time ?? "");
    rows.push({
      truck_id: truckId,
      day_of_week: Math.min(6, Math.max(0, Math.round(d.day))),
      location_name: location,
      location_lat: lat,
      location_lng: lng,
      start_time: start,
      end_time: end,
      is_recurring: true,
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
 * GO LIVE  (is_active + a today-only truck_schedules row)
 * ------------------------------------------------------------------ */

export interface GoLiveInput {
  locationName: string;
  lat: number;
  lng: number;
  servingUntil: string; // "HH:MM"
}

export async function goLiveAction(input: GoLiveInput): Promise<ActionResult> {
  const truckId = await requireOwnTruckId();
  const supabase = createClient();

  const name = (input.locationName ?? "").trim() || "Current location";
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    return { error: "Missing location coordinates." };
  }

  const now = new Date();
  const start = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const end = /^\d{2}:\d{2}/.test(input.servingUntil) ? input.servingUntil.slice(0, 5) : "23:59";
  const today = now.toISOString().slice(0, 10);

  await supabase
    .from("truck_schedules")
    .delete()
    .eq("truck_id", truckId)
    .not("specific_date", "is", null);

  const { error } = await supabase.from("truck_schedules").insert({
    truck_id: truckId,
    day_of_week: getMondayFirstDay(now),
    location_name: name,
    location_lat: input.lat,
    location_lng: input.lng,
    start_time: start,
    end_time: end,
    is_recurring: false,
    specific_date: today,
    notes: "live",
  });
  if (error) return { error: error.message };

  const { error: activeError } = await supabase
    .from("trucks")
    .update({ is_active: true })
    .eq("id", truckId);
  if (activeError) return { error: activeError.message };

  revalidateEverywhere();
  return { success: true };
}

export async function endServiceAction(): Promise<ActionResult> {
  const truckId = await requireOwnTruckId();
  const supabase = createClient();

  await supabase
    .from("truck_schedules")
    .delete()
    .eq("truck_id", truckId)
    .not("specific_date", "is", null);

  const { error } = await supabase.from("trucks").update({ is_active: false }).eq("id", truckId);
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
 * PHOTOS  (unchanged behaviour, moved with the route)
 * ------------------------------------------------------------------ */

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

  revalidatePath("/dashboard");
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

  revalidatePath("/dashboard");
  revalidatePath("/");
}

export async function reorderOwnPhotosAction(orderedIds: string[]) {
  const truckId = await requireOwnTruckId();
  const supabase = createClient();

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("truck_photos").update({ sort_order: index }).eq("id", id).eq("truck_id", truckId)
    )
  );

  revalidatePath("/dashboard");
  revalidatePath("/");
}
