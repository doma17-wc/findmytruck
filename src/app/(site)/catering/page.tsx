import type { Metadata } from "next";
import { ConciergeBell } from "lucide-react";
import { getCateringTrucks } from "@/lib/data";
import { OG_LOCALE_DEFAULTS } from "@/lib/seo";
import CateringGrid from "@/components/catering/CateringGrid";

export const dynamic = "force-dynamic";

const TITLE = "Foodtruck Catering Schweiz – Foodtruck mieten";
const DESCRIPTION =
  "Foodtruck mieten für Firmenanlass, Hochzeit oder private Feier: Foodtrucks aus der ganzen Schweiz für dein Catering, direkter Kontakt ohne Buchungsgebühr oder Mittelsmann.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://findmytruck.ch/catering" },
  openGraph: {
    ...OG_LOCALE_DEFAULTS,
    title: TITLE,
    description: DESCRIPTION,
    url: "https://findmytruck.ch/catering",
    type: "website",
  },
};

export default async function CateringPage() {
  const trucks = await getCateringTrucks();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Foodtruck Catering Schweiz",
    inLanguage: "de-CH",
    itemListElement: trucks.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://findmytruck.ch/trucks/${t.slug}`,
      name: t.name,
    })),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white">
          <ConciergeBell className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
            Catering
          </h1>
          <p className="text-[15px] text-neutral-600">
            Foodtrucks für private &amp; geschäftliche Anlässe — direkter Kontakt, kein Mittelsmann
          </p>
        </div>
      </div>

      {trucks.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-neutral-200 py-16 text-center">
          <p className="text-4xl">🍽️</p>
          <p className="mt-3 text-sm text-neutral-500">Aktuell bietet kein Truck Catering an.</p>
        </div>
      ) : (
        <CateringGrid trucks={trucks} />
      )}
    </div>
  );
}
