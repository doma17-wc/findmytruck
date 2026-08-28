"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ClaimFormState {
  error?: string;
  message?: string;
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * Claim an unclaimed truck profile. Creates the owner's auth account (unless
 * they're already signed in), links their profile to the truck, and moves the
 * truck to claim_status='pending' for an admin to verify.
 */
export async function claimTruckAction(
  slug: string,
  _prevState: ClaimFormState,
  formData: FormData
): Promise<ClaimFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmOwner = formData.get("confirm_owner") === "on";

  if (!confirmOwner) {
    return { error: "Please confirm that you own or represent this food truck." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (!email || !password) return { error: "Email and password are required." };
    if (password.length < 6) return { error: "Password must be at least 6 characters." };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(`/claim/${slug}`)}`,
      },
    });
    if (error) return { error: error.message };

    if (!data.session) {
      return {
        message:
          "Almost there — check your inbox to confirm your email, then open this page again to finish claiming your profile.",
      };
    }
  }

  const { error: rpcError } = await supabase.rpc("claim_truck", { p_slug: slug });
  if (rpcError) return { error: rpcError.message };

  revalidatePath("/", "layout");
  revalidatePath(`/trucks/${slug}`);
  redirect("/dashboard?claimed=1");
}
