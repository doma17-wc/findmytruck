"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyTruckJoined } from "@/lib/email";

export interface AuthFormState {
  error?: string;
  message?: string;
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

// ---------- Customer sign up (email + password) ----------

export async function signUpCustomerAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback`,
      data: { display_name: displayName || undefined },
    },
  });
  if (error) return { error: error.message };

  if (!data.session) {
    return { message: "Check your inbox to confirm your email, then sign in." };
  }

  await supabase.rpc("ensure_customer_profile", { p_display_name: displayName || null });
  revalidatePath("/", "layout");
  redirect("/account");
}

// ---------- Truck owner registration (email + password + truck name) ----------

export async function registerTruckOwnerAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const truckName = String(formData.get("truck_name") ?? "").trim();

  if (!email || !password) return { error: "Email and password are required." };
  if (!truckName) return { error: "Truck name is required." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback`,
      data: { display_name: truckName },
    },
  });
  if (error) return { error: error.message };

  if (!data.session) {
    return {
      message:
        "Check your inbox to confirm your email, then sign in to finish setting up your truck.",
    };
  }

  // Does a matching unclaimed profile already exist? If so, this registration
  // is really a claim-by-name (see register_truck_owner in migration 0005).
  const { data: existing } = await supabase
    .from("public_trucks")
    .select("id")
    .ilike("name", truckName.replace(/[%_\\]/g, "\\$&"))
    .eq("claim_status", "unclaimed")
    .limit(1)
    .maybeSingle();
  const isClaim = Boolean(existing);

  const { data: truckId, error: rpcError } = await supabase.rpc("register_truck_owner", {
    p_truck_name: truckName,
    p_display_name: truckName,
  });
  if (rpcError) return { error: rpcError.message };

  // Non-blocking owner notification — a failure here must never break signup.
  try {
    let slug: string | null = null;
    if (truckId) {
      const { data: truck } = await supabase
        .from("public_trucks")
        .select("slug")
        .eq("id", truckId)
        .maybeSingle();
      slug = truck?.slug ?? null;
    }
    await notifyTruckJoined({
      kind: isClaim ? "claim" : "registration",
      truckName,
      slug,
      ownerName: truckName,
      ownerEmail: email,
    });
  } catch (err) {
    console.error("[register-truck] notification failed:", err);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

// ---------- Sign in: email + password ----------

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/account");

  if (!email || !password) return { error: "Email and password are required." };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/account");
}

// ---------- Sign in: magic link ----------

export async function signInWithMagicLinkAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Email is required." };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback` },
  });
  if (error) return { error: error.message };

  return { message: "Check your inbox for a magic sign-in link." };
}

// ---------- Sign out ----------

export async function signOutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
