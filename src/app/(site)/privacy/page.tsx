import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">Privacy Policy</h1>
      <p className="mt-2 text-sm italic text-neutral-400">
        Draft template — have this reviewed by legal counsel before relying on it.
      </p>

      <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-neutral-600">
        <p>
          This Privacy Policy explains how <strong className="text-neutral-800">Paolino Grand Cru GmbH</strong>{" "}
          (Wolserstrasse, 8912 Obfelden, Switzerland, CHE-358.850.974), operator of FindMyTruck,
          collects and uses information.
        </p>
        <div>
          <h2 className="font-bold text-neutral-800">Data we collect</h2>
          <p className="mt-1">
            Account data (email, password) for customers and truck owners; truck profile data
            (name, description, location, schedule, photos) submitted by truck owners; and
            aggregate page-view counts for truck profile pages.
          </p>
        </div>
        <div>
          <h2 className="font-bold text-neutral-800">How we use it</h2>
          <p className="mt-1">
            To operate your account, display truck listings on the map and search pages, and give
            truck owners analytics about their own profile.
          </p>
        </div>
        <div>
          <h2 className="font-bold text-neutral-800">Your rights</h2>
          <p className="mt-1">
            You can request access to, correction of, or deletion of your data at any time by
            contacting{" "}
            <a href="mailto:info@findmytruck.ch" className="font-medium text-brand hover:underline">
              info@findmytruck.ch
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
