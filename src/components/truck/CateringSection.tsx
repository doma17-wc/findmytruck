import Image from "next/image";
import { Mail, MapPin, Phone, Users } from "lucide-react";
import type { PublicTruck } from "@/lib/types";
import {
  cateringMailto,
  cateringTel,
  formatGuestRange,
  isCateringAvailable,
  normalizeCateringOfferings,
  normalizeCateringPhotos,
} from "@/lib/catering";
import { SectionHeading } from "./pieces";

export default function CateringSection({ truck }: { truck: PublicTruck }) {
  if (!isCateringAvailable(truck)) return null;

  const description = truck.catering_description?.trim() || null;
  const offerings = normalizeCateringOfferings(truck.catering_offerings);
  const photos = normalizeCateringPhotos(truck.catering_photos);
  const guestRange = formatGuestRange(truck.catering_min_guests, truck.catering_max_guests);
  const email = truck.catering_contact_email?.trim() || null;
  const phone = truck.catering_contact_phone?.trim() || null;

  if (!description && offerings.length === 0 && !email && !phone) return null;

  return (
    <section id="catering" className="scroll-mt-24">
      <SectionHeading>Catering</SectionHeading>

      <div className="mt-3 space-y-4 rounded-2xl border border-line bg-card p-4 shadow-paper">
        {photos.length > 0 && (
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
            {photos.map((p) => (
              <div key={p.id} className="relative h-28 w-40 flex-shrink-0 overflow-hidden rounded-xl bg-paper-deep">
                <Image
                  src={p.url}
                  alt={p.caption ?? "Catering photo"}
                  fill
                  sizes="160px"
                  quality={85}
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {description && <p className="text-[14px] leading-relaxed text-ink-soft">{description}</p>}

        {(truck.catering_area || guestRange) && (
          <div className="flex flex-wrap gap-2">
            {truck.catering_area && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-deep px-2.5 py-1 text-[12px] font-semibold text-ink-soft">
                <MapPin className="h-3.5 w-3.5" />
                {truck.catering_area}
              </span>
            )}
            {guestRange && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-deep px-2.5 py-1 text-[12px] font-semibold text-ink-soft">
                <Users className="h-3.5 w-3.5" />
                {guestRange}
              </span>
            )}
          </div>
        )}

        {offerings.length > 0 && (
          <div className="space-y-2.5 border-t border-line pt-3">
            {offerings.map((o, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-ink">{o.name}</p>
                  {o.description && (
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">{o.description}</p>
                  )}
                </div>
                {o.price && (
                  <span className="flex-shrink-0 font-mono text-[13px] font-semibold text-ink-soft">
                    {o.price}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {(email || phone) && (
          <div className="flex flex-wrap gap-2 border-t border-line pt-3">
            {email && (
              <a
                href={cateringMailto(email, truck.name)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand/30 transition hover:brightness-105 active:scale-[0.99] sm:flex-none"
              >
                <Mail className="h-4 w-4" />
                Request catering
              </a>
            )}
            {phone && (
              <a
                href={cateringTel(phone)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-paper px-4 py-2.5 text-sm font-bold text-ink-soft transition hover:border-brand hover:text-brand"
              >
                <Phone className="h-4 w-4" />
                Call
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
