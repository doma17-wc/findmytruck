"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleFavoriteAction(truckId: string, isFavorited: boolean) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (isFavorited) {
    await supabase.from("user_favorites").delete().eq("user_id", user.id).eq("truck_id", truckId);
  } else {
    await supabase.from("user_favorites").insert({ user_id: user.id, truck_id: truckId });
  }

  revalidatePath("/favorites");
}
