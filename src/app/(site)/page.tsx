import HomeClient from "@/components/HomeClient";
import { getAllTrucksWithSchedules } from "@/lib/data";
import { getCurrentUserProfile, createClient } from "@/lib/supabase/server";

export const revalidate = 60;

export default async function HomePage() {
  const [trucks, auth] = await Promise.all([getAllTrucksWithSchedules(), getCurrentUserProfile()]);

  let favoritedIds: string[] = [];
  if (auth) {
    const supabase = createClient();
    const { data } = await supabase.from("user_favorites").select("truck_id").eq("user_id", auth.user.id);
    favoritedIds = (data ?? []).map((r) => r.truck_id as string);
  }

  return <HomeClient initialTrucks={trucks} signedIn={Boolean(auth)} favoritedIds={favoritedIds} />;
}
