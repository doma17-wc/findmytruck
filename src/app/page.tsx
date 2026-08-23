import HomeClient from "@/components/HomeClient";
import { getTodaysTruckStops } from "@/lib/data";

export const revalidate = 60;

export default async function HomePage() {
  const stops = await getTodaysTruckStops();
  return <HomeClient initialStops={stops} />;
}
