import HomeClient from "@/components/HomeClient";
import { getTodaysTruckStops } from "@/lib/data";
import { getCurrentUserProfile, createClient } from "@/lib/supabase/server";

export const revalidate = 60;

export default async function HomePage() {
  const [stops, auth] = await Promise.all([getTodaysTruckStops(), getCurrentUserProfile()]);

  let favoritedIds: string[] = [];
  if (auth) {
    const supabase = createClient();
    const { data } = await supabase.from("user_favorites").select("truck_id").eq("user_id", auth.user.id);
    favoritedIds = (data ?? []).map((r) => r.truck_id as string);
  }

  return <HomeClient initialStops={stops} signedIn={Boolean(auth)} favoritedIds={favoritedIds} />;
}
