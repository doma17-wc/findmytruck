import DiscoverClient from "@/components/discover/DiscoverClient";
import type { TruckRating } from "@/components/discover/types";
import { getAllTrucksWithSchedules } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { getCurrentUserProfile, createClient } from "@/lib/supabase/server";

export const revalidate = 60;

async function getRatings(): Promise<Record<string, TruckRating>> {
  const { data, error } = await supabase.from("reviews").select("truck_id, rating");
  if (error || !data) return {};

  const acc: Record<string, { sum: number; count: number }> = {};
  for (const row of data as { truck_id: string; rating: number }[]) {
    const a = (acc[row.truck_id] ??= { sum: 0, count: 0 });
    a.sum += row.rating;
    a.count += 1;
  }

  const out: Record<string, TruckRating> = {};
  for (const [id, { sum, count }] of Object.entries(acc)) {
    out[id] = { avg: Math.round((sum / count) * 10) / 10, count };
  }
  return out;
}

export default async function HomePage() {
  const [trucks, ratings, auth] = await Promise.all([
    getAllTrucksWithSchedules(),
    getRatings(),
    getCurrentUserProfile(),
  ]);

  let favoritedIds: string[] = [];
  if (auth) {
    const server = createClient();
    const { data } = await server
      .from("user_favorites")
      .select("truck_id")
      .eq("user_id", auth.user.id);
    favoritedIds = (data ?? []).map((r) => r.truck_id as string);
  }

  return (
    <DiscoverClient
      initialTrucks={trucks}
      ratings={ratings}
      auth={auth ? { email: auth.user.email ?? "", profile: auth.profile } : null}
      favoritedIds={favoritedIds}
    />
  );
}
