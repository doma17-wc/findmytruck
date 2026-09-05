"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Logged-in customer toggles "I'm interested" on an event. */
export async function toggleEventRsvpAction(
  eventId: string,
  isInterested: boolean
): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (isInterested) {
    const { error } = await supabase
      .from("event_rsvps")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("event_rsvps")
      .insert({ event_id: eventId, user_id: user.id, status: "interested" });
    if (error) return { error: error.message };
  }

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/account");
  return {};
}
