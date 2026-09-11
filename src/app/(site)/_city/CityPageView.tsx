import { notFound } from "next/navigation";
import { getAllActiveTrucks } from "@/lib/data";
import { getAllTruckRatings } from "@/lib/reviews";
import { getCity } from "@/lib/cities";
import CityBrowseClient from "@/components/CityBrowseClient";

/**
 * Shared body for every /<city> browse page — see src/app/(site)/zurich/page.tsx
 * for the thin per-route wrapper (metadata + this component). All cities show
 * the same active-truck list today; the page differentiates by city name in
 * the H1, copy, and <head> metadata (see src/lib/seo.ts's buildCityMetadata).
 */
export default async function CityPageView({ citySlug }: { citySlug: string }) {
  const city = getCity(citySlug);
  if (!city) notFound();

  const [trucks, ratings] = await Promise.all([getAllActiveTrucks(), getAllTruckRatings()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-16">
      <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
        Foodtrucks in {city.name}
      </h1>
      <p className="mt-2 text-[15px] text-neutral-600">
        {trucks.length} Foodtruck{trucks.length === 1 ? "" : "s"} aktuell auf FindMyTruck. Tippe
        auf einen Truck für Standort, Speisekarte und Öffnungszeiten.
      </p>

      <CityBrowseClient trucks={trucks} ratings={ratings} />

      {trucks.length === 0 && (
        <p className="mt-8 text-center text-sm text-neutral-500">
          Noch keine aktiven Foodtrucks. Schau bald wieder vorbei!
        </p>
      )}
    </div>
  );
}
