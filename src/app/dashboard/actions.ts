"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DASH_TRUCK_COOKIE } from "@/lib/dashboardTruck";
import { normalizeMenuItems, type MenuItem } from "@/lib/menu";
import { geocode } from "@/lib/geocode";
import { getMondayFirstDay } from "@/lib/geo";
import { DEFAULT_MAP_CENTER } from "@/lib/cities";
import { PHOTO_BUCKET, storagePathFromPublicUrl } from "@/lib/storage";
import {
  notifyEventInvitation,
  notifyFollowerTruckLive,
  notifyTruckJoined,
} from "@/lib/email";
import { normalizeEventType, type EventType, type ScheduleFrequency } from "@/lib/types";
import {
  normalizeCateringOfferings,
  normalizeCateringPhotos,
  type CateringOffering,
  type CateringPhoto,
} from "@/lib/catering";

/** Verify the current user owns `truckId` (via `truck_owners`, migration 0014)
 *  and return it. Every dashboard mutation is scoped to the truck the switcher
 *  currently has selected — the id is passed from the client and checked here
 *  (and again by RLS), so a tampered id just fails. */
async function requireOwnedTruckId(truckId: string | null | undefined): Promise<string> {
  if (!truckId) throw new Error("No truck selected");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: link } = await supabase
    .from("truck_owners")
    .select("truck_id")
    .eq("user_id", user.id)
    .eq("truck_id", truckId)
    .maybeSingle();

  if (!link) throw new Error("You don't manage this truck");
  return truckId;
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
  truckId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireOwnedTruckId(truckId);
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
    show_phone: formData.get("show_phone") === "on",
    show_email: formData.get("show_email") === "on",
    show_catering_contact: formData.get("show_catering_contact") === "on",
  };

  const { error } = await supabase.from("trucks").update(payload).eq("id", truckId);
  if (error) return { error: error.message };

  void supabase.rpc("record_owner_content_update", { p_truck_id: truckId });
  revalidateEverywhere();
  return { success: true };
}

/** Self-service pause: hide one of the owner's trucks from every public surface
 *  (map / list / browse / search / profile page) without deleting anything.
 *  Reuses `trucks.paused` (migration 0008) — the owner UPDATE RLS from 0014
 *  already scopes this to trucks they own. */
export async function setOwnTruckPausedAction(
  truckId: string,
  paused: boolean
): Promise<ActionResult> {
  await requireOwnedTruckId(truckId);
  const supabase = createClient();

  const { error } = await supabase.from("trucks").update({ paused }).eq("id", truckId);
  if (error) return { error: error.message };

  revalidateEverywhere();
  return { success: true };
}

/* ------------------------------------------------------------------ *
 * MENU  (inline editor -> trucks.menu_items jsonb)
 * ------------------------------------------------------------------ */

export async function saveMenuAction(truckId: string, items: unknown): Promise<ActionResult> {
  await requireOwnedTruckId(truckId);
  const supabase = createClient();

  const menuItems: MenuItem[] = normalizeMenuItems(items);

  const { error } = await supabase
    .from("trucks")
    .update({ menu_items: menuItems })
    .eq("id", truckId);
  if (error) return { error: error.message };

  void supabase.rpc("record_owner_content_update", { p_truck_id: truckId });
  revalidateEverywhere();
  return { success: true };
}

/* ------------------------------------------------------------------ *
 * TOUR SCHEDULE  (7-day form -> truck_schedules, geocoded server-side)
 * ------------------------------------------------------------------ */

/** One stop in the weekly tour. A day can carry any number of these (split
 *  services — e.g. Wed lunch at Bellevue AND Wed dinner at Oerlikon), each with
 *  its own location, hours and frequency. */
export interface TourSlotInput {
  day: number; // 0 = Mon .. 6 = Sun
  location: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  /** Coordinates already known for this location (skip re-geocoding). */
  lat: number | null;
  lng: number | null;
  /** How often this stop repeats. Defaults to "weekly" (every week, unchanged). */
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

export async function publishTourAction(
  truckId: string,
  slots: TourSlotInput[]
): Promise<ActionResult> {
  await requireOwnedTruckId(truckId);
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

  for (const d of slots) {
    const location = (d.location ?? "").trim();
    if (!location) continue;

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

  void supabase.rpc("record_owner_content_update", { p_truck_id: truckId });
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
  /** The pitch / location name the owner picked, for the follower notification. */
  locationName?: string | null;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://findmytruck.ch";

/** Fan out "a truck you follow is live" to its followers — in-app for everyone,
 *  e-mail for those opted in. Idempotent per truck per day (enforced in the
 *  RPC). Best-effort: never blocks or fails the boost. */
async function notifyFollowersOfBoost(
  supabase: ReturnType<typeof createClient>,
  truckId: string,
  locationName: string | null
) {
  try {
    const { data: truck } = await supabase
      .from("trucks")
      .select("name, slug")
      .eq("id", truckId)
      .maybeSingle();
    if (!truck) return;

    const near = locationName ? ` near ${locationName}` : "";
    const message = `${truck.name} is live now${near}`;
    const link = `/trucks/${truck.slug}`;

    const { data: recipients, error } = await supabase.rpc("notify_followers_truck_live", {
      p_truck_id: truckId,
      p_message: message,
      p_link: link,
    });
    if (error) {
      console.error("[boost] notify_followers_truck_live failed:", error.message);
      return;
    }

    const rows = (recipients ?? []) as { email: string; token: string }[];
    await Promise.all(
      rows.map((r) =>
        notifyFollowerTruckLive({
          to: r.email,
          truckName: truck.name,
          location: locationName,
          truckUrl: `${SITE_URL}/trucks/${truck.slug}`,
          unsubscribeUrl: `${SITE_URL}/unsubscribe?t=${r.token}`,
        }).catch(() => {})
      )
    );
  } catch (err) {
    console.error("[boost] follower notification threw:", err);
  }
}

export async function boostAction(truckId: string, input: BoostInput): Promise<ActionResult> {
  await requireOwnedTruckId(truckId);
  const supabase = createClient();

  const now = new Date();

  // Expiry = end of today's active recurring slot, else +4h.
  const { data: rows } = await supabase
    .from("truck_schedules")
    .select("day_of_week, start_time, end_time, specific_date, location_name")
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

  await notifyFollowersOfBoost(
    supabase,
    truckId,
    (input.locationName ?? active?.location_name ?? "").trim() || null
  );

  revalidateEverywhere();
  return { success: true };
}

export async function endBoostAction(truckId: string): Promise<ActionResult> {
  await requireOwnedTruckId(truckId);
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

export async function replyToReviewAction(
  truckId: string,
  reviewId: string,
  reply: string
): Promise<ActionResult> {
  await requireOwnedTruckId(truckId);
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

export async function addOwnPhotoAction(truckId: string, url: string, caption: string) {
  await requireOwnedTruckId(truckId);
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

export async function deleteOwnPhotoAction(truckId: string, photoId: string) {
  await requireOwnedTruckId(truckId);
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

export async function reorderOwnPhotosAction(truckId: string, orderedIds: string[]) {
  await requireOwnedTruckId(truckId);
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
  imageUrl: string | null;
  eventType: EventType;
  /** Other trucks the host wants to invite (truck ids). The host is never in
   *  this list — it's auto-linked as confirmed. */
  invitedTruckIds: string[];
}

function revalidateEvents() {
  revalidateEverywhere();
  revalidatePath("/events");
  revalidatePath("/events/[id]", "page");
}

function humanDateRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const s = new Date(`${start}T00:00:00`).toLocaleDateString("en", opts);
  if (start === end) return s;
  const e = new Date(`${end}T00:00:00`).toLocaleDateString("en", opts);
  return `${s} – ${e}`;
}

/** Add/remove `event_trucks` rows so the non-host links exactly match
 *  `wantedTruckIds` (status 'invited' for new ones). Emails freshly-invited
 *  trucks. Never touches the host's own link. Best-effort — collaboration
 *  failures don't block the event save. */
async function reconcileInvites(
  supabase: SupabaseServer,
  eventId: string,
  hostTruckId: string,
  hostTruckName: string,
  event: { name: string; start_date: string; end_date: string; location_name: string },
  wantedTruckIds: string[]
): Promise<void> {
  const wanted = Array.from(new Set(wantedTruckIds.filter((id) => id && id !== hostTruckId)));

  const { data: existing } = await supabase
    .from("event_trucks")
    .select("truck_id")
    .eq("event_id", eventId);
  const existingIds = new Set(
    ((existing ?? []) as { truck_id: string }[]).map((r) => r.truck_id)
  );

  const toAdd = wanted.filter((id) => !existingIds.has(id));
  const toRemove = Array.from(existingIds).filter(
    (id) => id !== hostTruckId && !wanted.includes(id)
  );

  if (toRemove.length > 0) {
    await supabase
      .from("event_trucks")
      .delete()
      .eq("event_id", eventId)
      .in("truck_id", toRemove);
  }

  if (toAdd.length === 0) return;

  const { error: insErr } = await supabase
    .from("event_trucks")
    .insert(toAdd.map((truck_id) => ({ event_id: eventId, truck_id, status: "invited" })));
  if (insErr) return;

  // Notify the freshly-invited trucks (non-blocking).
  const { data: trucks } = await supabase
    .from("trucks")
    .select("id, name, owner_email")
    .in("id", toAdd);
  await Promise.all(
    ((trucks ?? []) as { id: string; name: string; owner_email: string | null }[])
      .filter((t) => t.owner_email)
      .map((t) =>
        notifyEventInvitation({
          to: t.owner_email as string,
          invitedTruckName: t.name,
          hostTruckName,
          eventName: event.name,
          eventDate: humanDateRange(event.start_date, event.end_date),
          eventLocation: event.location_name,
        }).catch(() => {})
      )
  );
}

export async function saveOwnEventAction(
  truckId: string,
  eventId: string | null,
  input: EventInput
): Promise<ActionResult> {
  await requireOwnedTruckId(truckId);
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
    image_url: input.imageUrl?.trim() || null,
    event_type: normalizeEventType(input.eventType),
    created_by_truck_id: truckId,
  };

  const { data: myTruck } = await supabase
    .from("trucks")
    .select("name")
    .eq("id", truckId)
    .maybeSingle();
  const hostTruckName = (myTruck as { name?: string } | null)?.name ?? "A food truck";

  let targetId = eventId;
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
    targetId = data.id;
    const { error: linkError } = await supabase
      .from("event_trucks")
      .insert({ event_id: data.id, truck_id: truckId, status: "confirmed" });
    if (linkError) return { error: linkError.message };
  }

  if (targetId) {
    await reconcileInvites(
      supabase,
      targetId,
      truckId,
      hostTruckName,
      { name, start_date: input.startDate, end_date: input.endDate, location_name: location },
      input.invitedTruckIds ?? []
    );
  }

  revalidateEvents();
  return { success: true };
}

export async function deleteOwnEventAction(
  truckId: string,
  eventId: string
): Promise<ActionResult> {
  await requireOwnedTruckId(truckId);
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

/** An invited truck accepts or declines a collaboration invitation. */
export async function respondToEventInviteAction(
  truckId: string,
  eventId: string,
  response: "confirmed" | "declined"
): Promise<ActionResult> {
  await requireOwnedTruckId(truckId);
  const supabase = createClient();

  const { error } = await supabase
    .from("event_trucks")
    .update({ status: response })
    .eq("event_id", eventId)
    .eq("truck_id", truckId);
  if (error) return { error: error.message };

  revalidateEvents();
  return { success: true };
}

export interface TruckSearchResult {
  id: string;
  name: string;
  logo_url: string | null;
}

/** Name search over public trucks for the "invite a truck" picker. Excludes the
 *  caller's own truck. */
export async function searchTrucksAction(
  truckId: string,
  query: string
): Promise<TruckSearchResult[]> {
  await requireOwnedTruckId(truckId);
  const supabase = createClient();

  const q = query.trim();
  let req = supabase
    .from("public_trucks")
    .select("id, name, logo_url")
    .neq("id", truckId)
    .order("name")
    .limit(20);
  if (q) req = req.ilike("name", `%${q}%`);

  const { data } = await req;
  return (data ?? []) as TruckSearchResult[];
}

/** Move one photo to the front (sort_order 0) — used by "Set as cover". */
export async function setCoverOwnPhotoAction(truckId: string, photoId: string) {
  await requireOwnedTruckId(truckId);
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

/* ------------------------------------------------------------------ *
 * CATERING  (migration 0016) -- fields live directly on `trucks`, separate
 * from events and the weekly tour. No booking/payment: customers contact the
 * truck directly, so these actions only ever save what the owner typed.
 * ------------------------------------------------------------------ */

export async function setCateringAvailableAction(
  truckId: string,
  available: boolean
): Promise<ActionResult> {
  await requireOwnedTruckId(truckId);
  const supabase = createClient();

  const { error } = await supabase
    .from("trucks")
    .update({ catering_available: available })
    .eq("id", truckId);
  if (error) return { error: error.message };

  revalidateCatering();
  return { success: true };
}

export interface CateringInput {
  description: string;
  area: string;
  minGuests: string; // "" = blank
  maxGuests: string;
  contactEmail: string;
  contactPhone: string;
  offerings: CateringOffering[];
}

function parseGuestCount(raw: string): number | null {
  const n = Number(raw.trim());
  return raw.trim() !== "" && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export async function saveCateringAction(
  truckId: string,
  input: CateringInput
): Promise<ActionResult> {
  await requireOwnedTruckId(truckId);
  const supabase = createClient();

  const minGuests = parseGuestCount(input.minGuests);
  const maxGuests = parseGuestCount(input.maxGuests);
  if (minGuests !== null && maxGuests !== null && minGuests > maxGuests) {
    return { error: "Min guests can't be more than max guests." };
  }

  const payload = {
    catering_description: input.description.trim().slice(0, 3000) || null,
    catering_area: input.area.trim().slice(0, 200) || null,
    catering_min_guests: minGuests,
    catering_max_guests: maxGuests,
    catering_contact_email: input.contactEmail.trim().slice(0, 200) || null,
    catering_contact_phone: input.contactPhone.trim().slice(0, 60) || null,
    catering_offerings: normalizeCateringOfferings(input.offerings),
  };

  const { error } = await supabase.from("trucks").update(payload).eq("id", truckId);
  if (error) return { error: error.message };

  revalidateCatering();
  return { success: true };
}

function revalidateCatering() {
  revalidateEverywhere();
  revalidatePath("/catering");
}

async function readCateringPhotos(supabase: SupabaseServer, truckId: string): Promise<CateringPhoto[]> {
  const { data } = await supabase
    .from("trucks")
    .select("catering_photos")
    .eq("id", truckId)
    .maybeSingle();
  return normalizeCateringPhotos((data as { catering_photos: unknown } | null)?.catering_photos);
}

async function writeCateringPhotos(supabase: SupabaseServer, truckId: string, photos: CateringPhoto[]) {
  await supabase.from("trucks").update({ catering_photos: photos }).eq("id", truckId);
}

export async function addCateringPhotoAction(truckId: string, url: string) {
  await requireOwnedTruckId(truckId);
  const supabase = createClient();

  const photos = await readCateringPhotos(supabase, truckId);
  photos.push({ id: crypto.randomUUID(), url, caption: null });
  await writeCateringPhotos(supabase, truckId, photos);
  revalidateCatering();
}

export async function deleteCateringPhotoAction(truckId: string, photoId: string) {
  await requireOwnedTruckId(truckId);
  const supabase = createClient();

  const photos = await readCateringPhotos(supabase, truckId);
  const removed = photos.find((p) => p.id === photoId);
  await writeCateringPhotos(
    supabase,
    truckId,
    photos.filter((p) => p.id !== photoId)
  );

  const path = storagePathFromPublicUrl(removed?.url);
  if (path) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  }
  revalidateCatering();
}

export async function reorderCateringPhotosAction(truckId: string, orderedIds: string[]) {
  await requireOwnedTruckId(truckId);
  const supabase = createClient();

  const photos = await readCateringPhotos(supabase, truckId);
  const byId = new Map(photos.map((p) => [p.id, p]));
  const reordered = orderedIds.map((id) => byId.get(id)).filter((p): p is CateringPhoto => Boolean(p));
  await writeCateringPhotos(supabase, truckId, reordered);
  revalidateCatering();
}

export async function setCoverCateringPhotoAction(truckId: string, photoId: string) {
  await requireOwnedTruckId(truckId);
  const supabase = createClient();

  const photos = await readCateringPhotos(supabase, truckId);
  const idx = photos.findIndex((p) => p.id === photoId);
  if (idx > 0) {
    const [moved] = photos.splice(idx, 1);
    photos.unshift(moved);
  }
  await writeCateringPhotos(supabase, truckId, photos);
  revalidateCatering();
}

/* ------------------------------------------------------------------ *
 * TRUCK SWITCHER  (multi-truck per account, migration 0014)
 * ------------------------------------------------------------------ */

/** Remember which of the owner's trucks the dashboard is managing. Set by the
 *  switcher before it navigates, and read by the dashboard page + every action
 *  fallback. Verified against `truck_owners` so a stale/tampered cookie is
 *  ignored. */
export async function selectTruckAction(truckId: string): Promise<ActionResult> {
  await requireOwnedTruckId(truckId);
  cookies().set(DASH_TRUCK_COOKIE, truckId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/dashboard",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/dashboard");
  return { success: true };
}

/** Add another truck to the signed-in owner's account — claims an existing
 *  unclaimed listing with this exact name, or creates a new one. Reuses
 *  `register_truck_owner` (migration 0014 dropped its single-truck guard), so a
 *  logged-in owner never needs a second email/account. */
export async function addTruckAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const name = String(formData.get("truck_name") ?? "").trim();
  if (!name) return { error: "Truck name is required." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: existing } = await supabase
    .from("public_trucks")
    .select("id")
    .ilike("name", name.replace(/[%_\\]/g, "\\$&"))
    .eq("claim_status", "unclaimed")
    .limit(1)
    .maybeSingle();
  const isClaim = Boolean(existing);

  const { data: newTruckId, error } = await supabase.rpc("register_truck_owner", {
    p_truck_name: name,
    p_display_name: name,
  });
  if (error) return { error: error.message };

  // Non-blocking owner notification.
  try {
    let slug: string | null = null;
    if (newTruckId) {
      const { data: t } = await supabase
        .from("public_trucks")
        .select("slug")
        .eq("id", newTruckId)
        .maybeSingle();
      slug = t?.slug ?? null;
    }
    await notifyTruckJoined({
      kind: isClaim ? "claim" : "registration",
      truckName: name,
      slug,
      ownerName: name,
      ownerEmail: user.email ?? null,
    });
  } catch (err) {
    console.error("[add-truck] notification failed:", err);
  }

  if (newTruckId) {
    cookies().set(DASH_TRUCK_COOKIE, newTruckId as string, {
      httpOnly: false,
      sameSite: "lax",
      path: "/dashboard",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  redirect(newTruckId ? `/dashboard?truck=${newTruckId}` : "/dashboard");
}
