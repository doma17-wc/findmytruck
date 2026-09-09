import Link from "next/link";
import { MapPin, Users } from "lucide-react";
import type { PublicTruck } from "@/lib/types";
import { formatGuestRange, normalizeCateringPhotos } from "@/lib/catering";

export default function CateringCard({ truck }: { truck: PublicTruck }) {
  const photos = normalizeCateringPhotos(truck.catering_photos);
  const cover = photos[0]?.url ?? truck.cover_photo_url ?? truck.logo_url ?? null;
  const guestRange = formatGuestRange(truck.catering_min_guests, truck.catering_max_guests);

  return (
    <Link
      href={`/trucks/${truck.slug}#catering`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-brand-50">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={truck.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl">🍽️</div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-bold leading-snug text-neutral-900 group-hover:text-brand-700">
          {truck.name}
        </h3>
        <p className="mt-0.5 text-sm text-neutral-500">{truck.cuisine_type.join(" · ") || "Food truck"}</p>

        {truck.catering_description && (
          <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{truck.catering_description}</p>
        )}

        <div className="mt-3 flex flex-1 flex-wrap items-end gap-1.5">
          {truck.catering_area && (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-600">
              <MapPin className="h-3 w-3" />
              {truck.catering_area}
            </span>
          )}
          {guestRange && (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-600">
              <Users className="h-3 w-3" />
              {guestRange}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
