import type { Metadata } from "next";
import { getAllActiveTrucks } from "@/lib/data";
import ZurichBrowseClient from "@/components/ZurichBrowseClient";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Food Trucks in Zurich",
  description:
    "Browse every active food truck in Zurich — burgers, Thai, Mexican, and more. Find schedules, menus, and locations on FindMyTruck.",
  alternates: { canonical: "https://findmytruck.ch/zurich" },
  openGraph: {
    title: "Food Trucks in Zurich | FindMyTruck",
    description: "Browse every active food truck in Zurich with schedules, menus, and locations.",
    url: "https://findmytruck.ch/zurich",
  },
};

export default async function ZurichPage() {
  const trucks = await getAllActiveTrucks();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-16">
      <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
        Food Trucks in Zurich
      </h1>
      <p className="mt-2 text-[15px] text-neutral-600">
        {trucks.length} food truck{trucks.length === 1 ? "" : "s"} currently active around the
        city. Tap a truck to see its full schedule, menu, and location.
      </p>

      <ZurichBrowseClient trucks={trucks} />

      {trucks.length === 0 && (
        <p className="mt-8 text-center text-sm text-neutral-500">
          No active food trucks yet. Check back soon!
        </p>
      )}
    </div>
  );
}
