import { supabase } from "./supabase";
import type { PublicTruck, TruckSchedule, TruckPhoto } from "./types";

export async function getTruckBySlug(slug: string): Promise<PublicTruck | null> {
  const { data, error } = await supabase
    .from("public_trucks")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("getTruckBySlug error", error);
    return null;
  }
  // A paused truck (admin, migration 0008) is hidden from the public site.
  if (data && (data as PublicTruck).paused) return null;
  return data as PublicTruck | null;
}

export async function getTruckSchedule(truckId: string): Promise<TruckSchedule[]> {
  const { data, error } = await supabase
    .from("truck_schedules")
    .select("*")
    .eq("truck_id", truckId)
    .order("day_of_week", { ascending: true });

  if (error) {
    console.error("getTruckSchedule error", error);
    return [];
  }
  return (data ?? []) as TruckSchedule[];
}

export async function getTruckPhotos(truckId: string): Promise<TruckPhoto[]> {
  const { data, error } = await supabase
    .from("truck_photos")
    .select("*")
    .eq("truck_id", truckId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("getTruckPhotos error", error);
    return [];
  }
  return (data ?? []) as TruckPhoto[];
}

export interface TruckWithSchedules {
  truck: PublicTruck;
  schedules: TruckSchedule[];
}

/** Every active truck with its FULL weekly schedule (not just today's), so the
 * map/list can always show every truck along with when it's next open. */
export async function getAllTrucksWithSchedules(): Promise<TruckWithSchedules[]> {
  const schedulesCols = `id, truck_id, day_of_week, location_name, location_lat, location_lng,
        start_time, end_time, is_recurring, specific_date, notes`;
  // Frequency columns land in migration 0011 -- drives the "alternating Fridays" /
  // "1st & 3rd week" rules the day selector relies on. Fall back if not applied.
  const schedulesSelect = `truck_schedules (${schedulesCols},
        frequency, frequency_parity, frequency_weeks
      )`;
  const schedulesSelectBasic = `truck_schedules (${schedulesCols})`;
  const baseCols = `
      id, slug, name, description, cuisine_type, price_range,
      logo_url, cover_photo_url, menu_text, menu_items, menu_photo_url,
      instagram, tiktok, website, languages,
      food_type, dietary_options, payment_methods, features,
      is_active, is_claimed, short_code, created_at, updated_at`;
  // The unclaimed-profile columns land in migration 0005 and the boost columns
  // in 0007 -- fall back gracefully if the code is deployed before either has
  // been applied.
  const unclaimedCols = `claim_status, source_region, source_website, region_lat, region_lng`;
  const boostCols = `boosted, boost_expires_at, boost_started_at, boost_lat, boost_lng`;
  // Catering columns land in migration 0016 -- tried once up front, then this
  // whole chain falls back to its pre-catering form below if that's missing.
  const cateringCols = `catering_available, catering_description, catering_offerings, catering_area,
      catering_min_guests, catering_max_guests, catering_photos,
      catering_contact_email, catering_contact_phone`;

  const run = (cols: string) =>
    supabase
      .from("public_trucks")
      .select(cols)
      .eq("is_active", true)
      .order("name", { ascending: true });

  // `catering_*` lands in migration 0016 -- try it first, then fall back to
  // the pre-catering chain unchanged.
  let res = await run(
    `${baseCols}, ${unclaimedCols}, ${boostCols}, paused, ${cateringCols}, ${schedulesSelect}`
  );
  // `paused` lands in migration 0008 -- try it next, then fall back.
  if (res.error) res = await run(`${baseCols}, ${unclaimedCols}, ${boostCols}, paused, ${schedulesSelect}`);
  if (res.error) res = await run(`${baseCols}, ${unclaimedCols}, ${boostCols}, ${schedulesSelect}`);
  if (res.error) res = await run(`${baseCols}, ${unclaimedCols}, ${schedulesSelect}`);
  if (res.error) res = await run(`${baseCols}, ${schedulesSelect}`);
  // Frequency columns missing (pre-0011) -- retry without them.
  if (res.error) res = await run(`${baseCols}, ${unclaimedCols}, ${boostCols}, paused, ${schedulesSelectBasic}`);
  if (res.error) res = await run(`${baseCols}, ${unclaimedCols}, ${boostCols}, ${schedulesSelectBasic}`);
  if (res.error) res = await run(`${baseCols}, ${schedulesSelectBasic}`);
  const { data, error } = res;

  if (error) {
    console.error("getAllTrucksWithSchedules error", error);
    return [];
  }

  type Row = PublicTruck & { truck_schedules: TruckSchedule[] | null };
  return ((data ?? []) as unknown as Row[])
    .filter((row) => !row.paused)
    .map((row) => {
      const { truck_schedules, ...truck } = row;
      return { truck: truck as PublicTruck, schedules: truck_schedules ?? [] };
    });
}

export async function getAllActiveTrucks(): Promise<PublicTruck[]> {
  const { data, error } = await supabase
    .from("public_trucks")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("getAllActiveTrucks error", error);
    return [];
  }
  return ((data ?? []) as PublicTruck[]).filter((t) => !t.paused);
}

/** Every active, non-paused truck advertising catering (migration 0016), for
 *  the /catering directory. */
export async function getCateringTrucks(): Promise<PublicTruck[]> {
  const { data, error } = await supabase
    .from("public_trucks")
    .select("*")
    .eq("is_active", true)
    .eq("catering_available", true)
    .order("name", { ascending: true });

  if (error) {
    // Most likely migration 0016 hasn't been applied yet -- fail soft.
    console.error("getCateringTrucks error", error);
    return [];
  }
  return ((data ?? []) as PublicTruck[]).filter((t) => !t.paused);
}
