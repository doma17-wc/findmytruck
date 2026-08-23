"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { ADMIN_COOKIE, hashAdminPassword } from "@/lib/adminAuth";

// ---------- Auth ----------

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password !== process.env.ADMIN_PASSWORD) {
    redirect("/admin/login?error=1");
  }
  const token = await hashAdminPassword(password);
  cookies().set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect("/admin");
}

export async function logoutAction() {
  cookies().delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

// ---------- Trucks ----------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface TruckFormState {
  error?: string;
}

export async function saveTruckAction(
  truckId: string | null,
  _prevState: TruckFormState,
  formData: FormData
): Promise<TruckFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const cuisineType = String(formData.get("cuisine_type") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const languages = String(formData.get("languages") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const payload = {
    name,
    slug: String(formData.get("slug") ?? "").trim() || slugify(name),
    description: String(formData.get("description") ?? "") || null,
    cuisine_type: cuisineType,
    price_range: String(formData.get("price_range") ?? "") || null,
    logo_url: String(formData.get("logo_url") ?? "") || null,
    cover_photo_url: String(formData.get("cover_photo_url") ?? "") || null,
    menu_text: String(formData.get("menu_text") ?? "") || null,
    menu_photo_url: String(formData.get("menu_photo_url") ?? "") || null,
    instagram: String(formData.get("instagram") ?? "") || null,
    tiktok: String(formData.get("tiktok") ?? "") || null,
    website: String(formData.get("website") ?? "") || null,
    phone: String(formData.get("phone") ?? "") || null,
    owner_name: String(formData.get("owner_name") ?? "") || null,
    owner_email: String(formData.get("owner_email") ?? "") || null,
    languages,
    is_active: formData.get("is_active") === "on",
  };

  if (truckId) {
    const { error } = await supabase.from("trucks").update(payload).eq("id", truckId);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("trucks")
      .insert(payload)
      .select("id")
      .single();
    if (error) return { error: error.message };
    revalidatePath("/admin");
    redirect(`/admin/trucks/${data.id}`);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/trucks/${truckId}`);
  revalidatePath(`/trucks/${payload.slug}`);
  revalidatePath("/zurich");
  revalidatePath("/");
  return {};
}

export async function deleteTruckAction(truckId: string) {
  await supabase.from("trucks").delete().eq("id", truckId);
  revalidatePath("/admin");
  redirect("/admin");
}

// ---------- Schedules ----------

export async function saveScheduleAction(
  truckId: string,
  scheduleId: string | null,
  formData: FormData
) {
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
    await supabase.from("truck_schedules").update(payload).eq("id", scheduleId);
  } else {
    await supabase.from("truck_schedules").insert(payload);
  }

  revalidatePath(`/admin/trucks/${truckId}`);
  revalidatePath("/");
}

export async function deleteScheduleAction(truckId: string, scheduleId: string) {
  await supabase.from("truck_schedules").delete().eq("id", scheduleId);
  revalidatePath(`/admin/trucks/${truckId}`);
  revalidatePath("/");
}

// ---------- Photos ----------

export async function addPhotoAction(truckId: string, url: string, caption: string) {
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

  revalidatePath(`/admin/trucks/${truckId}`);
}

export async function deletePhotoAction(truckId: string, photoId: string) {
  await supabase.from("truck_photos").delete().eq("id", photoId);
  revalidatePath(`/admin/trucks/${truckId}`);
}

// ---------- QR codes ----------

function randomShortCode(): string {
  return Math.random().toString(36).slice(2, 8);
}

export async function generateQrCodeAction(truckId: string, slug: string) {
  const shortCode = randomShortCode();
  const destinationUrl = `https://findmytruck.ch/trucks/${slug}`;

  await supabase.from("qr_redirects").insert({
    short_code: shortCode,
    truck_id: truckId,
    destination_url: destinationUrl,
  });

  await supabase.from("trucks").update({ short_code: shortCode }).eq("id", truckId);

  revalidatePath(`/admin/trucks/${truckId}`);
}
