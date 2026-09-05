"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface SimpleResult {
  error?: string;
  success?: boolean;
}

/** Per-account toggle: "Notify me when trucks I follow go live". */
export async function setNotifyPreferenceAction(on: boolean): Promise<SimpleResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ notify_follow_live: on })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/account");
  return { success: true };
}

/** Mark some (or, with no ids, all) of the current user's notifications read. */
export async function markNotificationsReadAction(ids?: string[]): Promise<SimpleResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  let query = supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
  if (ids && ids.length > 0) query = query.in("id", ids);
  else query = query.eq("read", false);

  const { error } = await query;
  if (error) return { error: error.message };

  revalidatePath("/account");
  return { success: true };
}
