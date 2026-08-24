import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">About FindMyTruck</h1>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-neutral-600">
        <p>
          FindMyTruck helps you find food trucks near you in real time — where they are today, when
          they open, and what they serve. Food truck owners get a free profile page, a live map
          listing, and a simple dashboard to manage their schedule, menu, and photos.
        </p>
        <p>
          FindMyTruck is a product by <strong className="text-neutral-800">Paolino Grand Cru GmbH</strong>,
          based in Obfelden, Switzerland.
        </p>
      </div>
    </div>
  );
}
