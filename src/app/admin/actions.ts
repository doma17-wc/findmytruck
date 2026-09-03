"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { normalizeMenuItems } from "@/lib/menu";
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

// ---------- helpers ----------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function revalidatePublic(slug?: string | null) {
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/zurich");
  revalidatePath("/trucks/[slug]", "page");
  if (slug) revalidatePath(`/trucks/${slug}`);
}

// ---------- Trucks ----------

export interface TruckFormState {
  error?: string;
  success?: boolean;
}

export async function saveTruckAction(
  truckId: string | null,
  _prevState: TruckFormState,
  formData: FormData
): Promise<TruckFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const csv = (key: string) =>
    String(formData.get(key) ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const claimStatusRaw = String(formData.get("claim_status") ?? "unclaimed");
  const claimStatus = ["unclaimed", "pending", "claimed"].includes(claimStatusRaw)
    ? claimStatusRaw
    : "unclaimed";

  const slug = String(formData.get("slug") ?? "").trim() || slugify(name);

  const payload = {
    name,
    slug,
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
    owner_name: String(formData.get("owner_name") ?? "") || null,
    owner_email: String(formData.get("owner_email") ?? "") || null,
    languages: csv("languages"),
    food_type: csv("food_type"),
    dietary_options: csv("dietary_options"),
    payment_methods: csv("payment_methods"),
    features: csv("features"),
    is_active: formData.get("is_active") === "on",
    claim_status: claimStatus,
    is_claimed: claimStatus === "claimed",
    source_region: String(formData.get("source_region") ?? "") || null,
    source_website: String(formData.get("source_website") ?? "") || null,
  };

  // Boost override (columns from migration 0007).
  const boostOn = formData.get("boost_enabled") === "on";
  const rawExpires = String(formData.get("boost_expires_at") ?? "").trim();
  const boostPayload = boostOn
    ? {
        boosted: true,
        boost_started_at: new Date().toISOString(),
        boost_expires_at: rawExpires
          ? new Date(rawExpires).toISOString()
          : new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      }
    : {
        boosted: false,
        boost_started_at: null,
        boost_expires_at: null,
        boost_lat: null,
        boost_lng: null,
      };

  // `paused` is migration 0008 -- keep it in its own update so the rest still
  // saves if the migration hasn't been applied yet.
  const paused = formData.get("paused") === "on";

  let id = truckId;
  if (truckId) {
    const { error } = await supabase
      .from("trucks")
      .update({ ...payload, ...boostPayload })
      .eq("id", truckId);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("trucks")
      .insert({ ...payload, ...boostPayload })
      .select("id")
      .single();
    if (error) return { error: error.message };
    id = data.id;
  }

  const { error: pausedErr } = await supabase
    .from("trucks")
    .update({ paused })
    .eq("id", id!);
  if (pausedErr && !/column .*paused.* does not exist/i.test(pausedErr.message)) {
    return { error: pausedErr.message };
  }

  revalidatePublic(slug);
  revalidatePath(`/admin/trucks/${id}`);

  if (!truckId) redirect(`/admin/trucks/${id}`);
  return { success: true };
}

export async function saveTruckMenuAction(truckId: string, items: unknown) {
  const menuItems = normalizeMenuItems(items);
  const { error } = await supabase
    .from("trucks")
    .update({ menu_items: menuItems })
    .eq("id", truckId);
  if (error) return { error: error.message };
  revalidatePublic();
  revalidatePath(`/admin/trucks/${truckId}`);
  return { success: true };
}

export async function deleteTruckAction(truckId: string) {
  // Detach any owner account first so no profile is left pointing at a dead
  // truck (best effort -- only possible with the service-role key).
  const service = getServiceSupabase();
  if (service) {
    await service.rpc("admin_unlink_truck_owner", { p_truck_id: truckId });
  }
  const { error } = await supabase.from("trucks").delete().eq("id", truckId);
  if (error) return { error: error.message };
  revalidatePublic();
  return { success: true };
}

export async function pauseTruckAction(truckId: string, paused: boolean) {
  const { error } = await supabase.from("trucks").update({ paused }).eq("id", truckId);
  if (error) return { error: error.message };
  revalidatePublic();
  return { success: true };
}

export async function setBoostOverrideAction(truckId: string, on: boolean) {
  const payload = on
    ? {
        boosted: true,
        boost_started_at: new Date().toISOString(),
        boost_expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      }
    : {
        boosted: false,
        boost_started_at: null,
        boost_expires_at: null,
        boost_lat: null,
        boost_lng: null,
      };
  const { error } = await supabase.from("trucks").update(payload).eq("id", truckId);
  if (error) return { error: error.message };
  revalidatePublic();
  return { success: true };
}

// ---------- Claims ----------

/** Approve a pending claim: mark the profile fully claimed + verified. */
export async function approveClaimAction(truckId: string) {
  await supabase
    .from("trucks")
    .update({ claim_status: "claimed", is_claimed: true })
    .eq("id", truckId);
  revalidatePublic();
  return { success: true };
}

export async function setClaimStatusAction(
  truckId: string,
  status: "unclaimed" | "pending" | "claimed"
) {
  await supabase
    .from("trucks")
    .update({ claim_status: status, is_claimed: status === "claimed" })
    .eq("id", truckId);
  revalidatePublic();
  return { success: true };
}

/** Link a truck-owner account (by email) to a truck. Needs the service key. */
export async function assignOwnerByEmailAction(truckId: string, email: string) {
  const service = getServiceSupabase();
  if (!service) {
    return { error: "Set SUPABASE_SERVICE_ROLE_KEY in the environment to manage owner accounts." };
  }
  const { error } = await service.rpc("admin_link_truck_owner", {
    p_email: email.trim(),
    p_truck_id: truckId,
  });
  if (error) return { error: error.message };
  revalidatePublic();
  return { success: true };
}

export async function unassignOwnerAction(truckId: string) {
  const service = getServiceSupabase();
  if (!service) {
    return { error: "Set SUPABASE_SERVICE_ROLE_KEY in the environment to manage owner accounts." };
  }
  const { error } = await service.rpc("admin_unlink_truck_owner", { p_truck_id: truckId });
  if (error) return { error: error.message };
  revalidatePublic();
  return { success: true };
}

// ---------- Users ----------

export async function deleteUserAction(userId: string) {
  const service = getServiceSupabase();
  if (!service) {
    return { error: "Set SUPABASE_SERVICE_ROLE_KEY in the environment to delete user accounts." };
  }

  // If this user owns a truck, release it back to "unclaimed" so the profile
  // isn't the only thing standing between the truck and a future claim.
  const { data: profile } = await service
    .from("profiles")
    .select("truck_id, role")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.truck_id) {
    await service.rpc("admin_unlink_truck_owner", { p_truck_id: profile.truck_id });
  }

  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePublic();
  return { success: true };
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
  revalidatePublic();
}

export async function deleteScheduleAction(truckId: string, scheduleId: string) {
  await supabase.from("truck_schedules").delete().eq("id", scheduleId);
  revalidatePath(`/admin/trucks/${truckId}`);
  revalidatePublic();
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
