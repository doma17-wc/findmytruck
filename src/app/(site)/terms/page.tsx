import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">Terms of Use</h1>
      <p className="mt-2 text-sm italic text-neutral-400">
        Draft template — have this reviewed by legal counsel before relying on it.
      </p>

      <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-neutral-600">
        <p>
          These Terms govern your use of FindMyTruck, operated by{" "}
          <strong className="text-neutral-800">Paolino Grand Cru GmbH</strong> (Wolserstrasse, 8912
          Obfelden, Switzerland, CHE-358.850.974).
        </p>
        <div>
          <h2 className="font-bold text-neutral-800">Accounts</h2>
          <p className="mt-1">
            You are responsible for the accuracy of information you submit, including your truck's
            schedule, location, and menu, and for keeping your login credentials secure.
          </p>
        </div>
        <div>
          <h2 className="font-bold text-neutral-800">Acceptable use</h2>
          <p className="mt-1">
            Don't submit false or misleading truck listings, and don't use the service to harm or
            impersonate others.
          </p>
        </div>
        <div>
          <h2 className="font-bold text-neutral-800">Availability</h2>
          <p className="mt-1">
            FindMyTruck is provided "as is" without warranty. We may modify or discontinue the
            service at any time.
          </p>
        </div>
        <p>
          Questions? Contact{" "}
          <a href="mailto:info@findmytruck.ch" className="font-medium text-brand hover:underline">
            info@findmytruck.ch
          </a>
          .
        </p>
      </div>
    </div>
  );
}
