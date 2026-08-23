import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAllActiveTrucks } from "@/lib/data";

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
    <div className="min-h-dvh bg-white pb-12">
      <header className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🚚</span>
          <span className="text-lg font-bold text-neutral-900">
            Find<span className="text-brand">My</span>Truck
          </span>
        </Link>
        <Link
          href="/"
          className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand"
        >
          View map
        </Link>
      </header>

      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold text-neutral-900">Food Trucks in Zurich</h1>
        <p className="mt-2 text-[15px] text-neutral-600">
          {trucks.length} food truck{trucks.length === 1 ? "" : "s"} currently active around the
          city. Tap a truck to see its full schedule, menu, and location.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trucks.map((truck) => (
            <Link
              key={truck.id}
              href={`/trucks/${truck.slug}`}
              className="overflow-hidden rounded-2xl border border-neutral-100 shadow-sm active:opacity-80"
            >
              <div className="relative h-40 w-full bg-neutral-100">
                {truck.cover_photo_url ? (
                  <Image
                    src={truck.cover_photo_url}
                    alt={truck.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl">
                    🚚
                  </div>
                )}
              </div>
              <div className="p-4">
                <h2 className="text-base font-bold text-neutral-900">{truck.name}</h2>
                <p className="mt-1 text-sm text-neutral-500">{truck.cuisine_type.join(", ")}</p>
                {truck.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{truck.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>

        {trucks.length === 0 && (
          <p className="mt-8 text-center text-sm text-neutral-500">
            No active food trucks yet. Check back soon!
          </p>
        )}
      </div>
    </div>
  );
}
