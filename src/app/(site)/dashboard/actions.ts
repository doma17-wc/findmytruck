"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

export interface DashboardFormState {
  error?: string;
  success?: boolean;
}

export async function saveOwnTruckAction(
  _prevState: DashboardFormState,
  formData: FormData
): Promise<DashboardFormState> {
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
    menu_text: String(formData.get("menu_text") ?? "") || null,
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

  revalidatePath("/dashboard");
  revalidatePath("/");
  return { success: true };
}

export async function saveOwnScheduleAction(scheduleId: string | null, formData: FormData) {
  const truckId = await requireOwnTruckId();
  const supabase = createClient();

  const payload = {
    truck_id: truckId,
    day_of_week: Number(formData.get("day_of_week")),
    location_name: String(formData.get("location_name") ?? ""),
    location_lat: Number(formData.get("location_lat")),
    location_lng: Number(formData.get("location_lng")),
    start_time: String(formData.get("start_time")),
    end_time: String(formData.get("end_time")),
    is_recurring: formData.get("is_recurring") === "on",
    notes: String(formData.get("notes") ?? "") || null,
  };

  if (scheduleId) {
    await supabase.from("truck_schedules").update(payload).eq("id", scheduleId).eq("truck_id", truckId);
  } else {
    await supabase.from("truck_schedules").insert(payload);
  }

  revalidatePath("/dashboard");
  revalidatePath("/");
}

export async function deleteOwnScheduleAction(scheduleId: string) {
  const truckId = await requireOwnTruckId();
  const supabase = createClient();
  await supabase.from("truck_schedules").delete().eq("id", scheduleId).eq("truck_id", truckId);
  revalidatePath("/dashboard");
  revalidatePath("/");
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

  revalidatePath("/dashboard");
}

export async function deleteOwnPhotoAction(photoId: string) {
  const truckId = await requireOwnTruckId();
  const supabase = createClient();
  await supabase.from("truck_photos").delete().eq("id", photoId).eq("truck_id", truckId);
  revalidatePath("/dashboard");
}
