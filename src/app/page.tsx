import DiscoverClient from "@/components/discover/DiscoverClient";
import { getAllTrucksWithSchedules } from "@/lib/data";
import { getAllUpcomingEvents, getUpcomingEventsByTruck } from "@/lib/events";
import { getAllTruckRatings } from "@/lib/reviews";
import { getBooleanSetting } from "@/lib/settings";
import { getCurrentUserProfile, createClient } from "@/lib/supabase/server";

export const revalidate = 60;

export default async function HomePage() {
  const [trucks, ratings, auth, reviewsRequireLogin] = await Promise.all([
    getAllTrucksWithSchedules(),
    getAllTruckRatings(),
    getCurrentUserProfile(),
    getBooleanSetting("reviews_require_login", false),
  ]);
  const [eventsByTruck, allEvents] = await Promise.all([
    getUpcomingEventsByTruck(trucks.map((t) => t.truck.id)),
    getAllUpcomingEvents(),
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
      eventsByTruck={eventsByTruck}
      allEvents={allEvents}
      auth={auth ? { email: auth.user.email ?? "", profile: auth.profile } : null}
      favoritedIds={favoritedIds}
      reviewsRequireLogin={reviewsRequireLogin}
    />
  );
}
