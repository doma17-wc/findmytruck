import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">Contact</h1>
      <div className="mt-4 space-y-1.5 text-[15px] text-neutral-600">
        <p className="font-semibold text-neutral-800">Paolino Grand Cru GmbH</p>
        <p>Wolserstrasse, 8912 Obfelden, Switzerland</p>
        <p>CHE-358.850.974</p>
        <p className="pt-2">
          Email:{" "}
          <a href="mailto:info@findmytruck.ch" className="font-medium text-brand hover:underline">
            info@findmytruck.ch
          </a>
        </p>
      </div>
    </div>
  );
}
