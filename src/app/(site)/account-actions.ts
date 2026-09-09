"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, getCurrentUserProfile } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/admin";

export interface SimpleResult {
  error?: string;
  success?: boolean;
}

/**
 * Customer "pause account" — a reversible switch (migration 0015). While on, the
 * account is excluded from the follow/live notification fan-out (enforced in the
 * `notify_followers_truck_live` RPC). Follows, reviews and RSVPs are untouched.
 */
export async function setAccountDeactivatedAction(deactivated: boolean): Promise<SimpleResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ deactivated })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/account");
  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Permanently delete the signed-in user's own account. Legal requirement
 * (GDPR / nFADP), so it's always available.
 *
 * Truck owner: every truck they manage is released back to `unclaimed` — the
 * public listing, menu, schedule, photos and reviews all stay online; anyone can
 * re-claim it later. (Same handling as the admin "delete user" flow.)
 *
 * Customer: reviews they wrote are kept but attributed to "Former guest"; the
 * auth-user delete then cascades their profile, follows, RSVPs and notifications.
 *
 * The actual auth-user deletion needs the service-role key and runs only here,
 * server-side.
 */
export async function deleteMyAccountAction(): Promise<SimpleResult> {
  const auth = await getCurrentUserProfile();
  if (!auth) return { error: "Not authenticated" };

  const service = getServiceSupabase();
  if (!service) {
    return { error: "Account deletion is temporarily unavailable. Please contact support." };
  }

  const userId = auth.user.id;

  // 1. Release every owned truck back to "unclaimed" (multi-truck, migration 0014).
  const { data: ownerLinks } = await service
    .from("truck_owners")
    .select("truck_id")
    .eq("user_id", userId);
  for (const link of (ownerLinks ?? []) as { truck_id: string }[]) {
    const { error } = await service.rpc("admin_unlink_one_truck_owner", {
      p_user_id: userId,
      p_truck_id: link.truck_id,
    });
    if (error) return { error: `Couldn't release your truck: ${error.message}` };
  }

  // 2. Anonymise any reviews this user wrote (the FK is ON DELETE SET NULL, so
  //    the rows survive the auth-user delete — this strips the display name).
  await service.from("reviews").update({ author_name: "Former guest" }).eq("user_id", userId);

  // 3. Delete the auth user — cascades profiles, user_favorites, event_rsvps,
  //    notifications, truck_owners.
  const { error: delError } = await service.auth.admin.deleteUser(userId);
  if (delError) return { error: delError.message };

  // 4. Clear the now-orphaned session and leave.
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
