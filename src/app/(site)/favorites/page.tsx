import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserProfile, createClient } from "@/lib/supabase/server";
import type { PublicTruck } from "@/lib/types";
import FavoriteButton from "@/components/FavoriteButton";

export const metadata = { title: "My favorites" };
export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const auth = await getCurrentUserProfile();
  if (!auth) redirect("/login?next=/favorites");

  const supabase = createClient();
  const { data } = await supabase
    .from("user_favorites")
    .select("truck_id, truck:trucks!inner(id, slug, name, cuisine_type, logo_url, cover_photo_url, price_range, is_active)")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  type Row = { truck_id: string; truck: PublicTruck | PublicTruck[] };
  const trucks = ((data ?? []) as unknown as Row[])
    .map((row) => (Array.isArray(row.truck) ? row.truck[0] : row.truck))
    .filter((t): t is PublicTruck => Boolean(t));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-900">My favorites</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {trucks.length} truck{trucks.length === 1 ? "" : "s"} you&apos;re following.
      </p>

      {trucks.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-neutral-200 py-14 text-center">
          <p className="text-3xl">🚚</p>
          <p className="mt-3 text-sm text-neutral-500">
            No favorites yet. Tap the heart on a truck to save it here.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-full bg-brand px-4 py-2 text-sm font-bold text-white"
          >
            Browse trucks
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {trucks.map((truck) => (
            <div
              key={truck.id}
              className="group relative overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-card transition hover:shadow-card-hover"
            >
              <Link href={`/trucks/${truck.slug}`} className="block">
                <div className="relative h-36 w-full bg-neutral-100">
                  {truck.cover_photo_url ? (
                    <Image src={truck.cover_photo_url} alt={truck.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl">🚚</div>
                  )}
                  {!truck.is_active && (
                    <span className="absolute left-3 top-3 rounded-full bg-neutral-900/80 px-2.5 py-1 text-xs font-semibold text-white">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="truncate font-bold text-neutral-900">{truck.name}</h2>
                  <p className="mt-0.5 truncate text-sm text-neutral-500">
                    {truck.cuisine_type.join(", ")}
                  </p>
                </div>
              </Link>
              <div className="absolute right-3 top-3">
                <FavoriteButton truckId={truck.id} initialFavorited signedIn size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
