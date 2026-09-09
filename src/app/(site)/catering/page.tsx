import type { Metadata } from "next";
import { ConciergeBell } from "lucide-react";
import { getCateringTrucks } from "@/lib/data";
import CateringGrid from "@/components/catering/CateringGrid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Food Truck Catering in Switzerland",
  description:
    "Book a food truck for your private party or company event — browse Swiss food trucks available for catering and contact them directly. No booking fees, no middleman.",
  alternates: { canonical: "https://findmytruck.ch/catering" },
};

export default async function CateringPage() {
  const trucks = await getCateringTrucks();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Food truck catering in Switzerland",
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
            Food trucks available for private &amp; corporate events — contact them directly
          </p>
        </div>
      </div>

      {trucks.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-neutral-200 py-16 text-center">
          <p className="text-4xl">🍽️</p>
          <p className="mt-3 text-sm text-neutral-500">No trucks are offering catering right now.</p>
        </div>
      ) : (
        <CateringGrid trucks={trucks} />
      )}
    </div>
  );
}
