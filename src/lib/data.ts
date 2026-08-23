import { supabase } from "./supabase";
import { getMondayFirstDay } from "./geo";
import type { PublicTruck, TruckSchedule, TruckPhoto } from "./types";

export interface TruckStop {
  truck: PublicTruck;
  schedule: TruckSchedule;
}

/** All schedule entries for today (Mon-first day index) joined with their public truck data. */
export async function getTodaysTruckStops(date: Date = new Date()): Promise<TruckStop[]> {
  const dayOfWeek = getMondayFirstDay(date);

  const { data, error } = await supabase
    .from("truck_schedules")
    .select(
      `
      id, truck_id, day_of_week, location_name, location_lat, location_lng,
      start_time, end_time, is_recurring, specific_date, notes,
      truck:public_trucks!inner (
        id, slug, name, description, cuisine_type, price_range,
        logo_url, cover_photo_url, menu_text, menu_photo_url,
        instagram, tiktok, website, languages,
        is_active, is_claimed, short_code, created_at, updated_at
      )
    `
    )
    .eq("day_of_week", dayOfWeek);

  if (error) {
    console.error("getTodaysTruckStops error", error);
    return [];
  }

  type Row = Omit<TruckSchedule, "truck_id"> & {
    truck_id: string;
    truck: PublicTruck | PublicTruck[];
  };

  return ((data ?? []) as unknown as Row[])
    .map((row) => {
      const truck = Array.isArray(row.truck) ? row.truck[0] : row.truck;
      if (!truck || !truck.is_active) return null;
      const { truck: _t, ...schedule } = row;
      return { truck, schedule: schedule as TruckSchedule };
    })
    .filter((x): x is TruckStop => x !== null);
}

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
  return (data ?? []) as PublicTruck[];
}
