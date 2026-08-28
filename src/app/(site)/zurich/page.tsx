import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllActiveTrucks } from "@/lib/data";
import { getCity } from "@/lib/cities";
import CityBrowseClient from "@/components/CityBrowseClient";

export const revalidate = 300;

// This route is Zurich today, but everything below is city-agnostic: adding
// src/app/(site)/<slug>/page.tsx for another registered Swiss city is a copy of
// this file with a different CITY_SLUG.
const CITY_SLUG = "zurich";

const city = getCity(CITY_SLUG);

export const metadata: Metadata = city
  ? {
      title: `Food Trucks in ${city.name}`,
      description: `Browse every active food truck in ${city.name} — burgers, Thai, Mexican, and more. Find schedules, menus, and locations on FindMyTruck.`,
      alternates: { canonical: `https://findmytruck.ch/${city.slug}` },
      openGraph: {
        title: `Food Trucks in ${city.name} | FindMyTruck`,
        description: `Browse every active food truck in ${city.name} with schedules, menus, and locations.`,
        url: `https://findmytruck.ch/${city.slug}`,
      },
    }
  : {};

export default async function CityPage() {
  if (!city) notFound();

  const trucks = await getAllActiveTrucks();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-16">
      <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
        Food Trucks in {city.name}
      </h1>
      <p className="mt-2 text-[15px] text-neutral-600">
        {trucks.length} food truck{trucks.length === 1 ? "" : "s"} currently active around the
        city. Tap a truck to see its full schedule, menu, and location.
      </p>

      <CityBrowseClient trucks={trucks} />

      {trucks.length === 0 && (
        <p className="mt-8 text-center text-sm text-neutral-500">
          No active food trucks yet. Check back soon!
        </p>
      )}
    </div>
  );
}
