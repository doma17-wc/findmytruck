import type { Metadata } from "next";
import LegalPage from "@/components/site/LegalPage";
import CookiePreferences from "@/components/site/CookiePreferences";
import { COOKIES } from "@/lib/legalContent";

export const metadata: Metadata = {
  title: "Cookie-Hinweis",
  description: "Welche Cookies FindMyTruck verwendet und wie du deine Auswahl verwaltest.",
};

export default function CookiesPage() {
  return (
    <>
      <div className="mx-auto max-w-2xl px-4 pt-10 sm:pt-14">
        <CookiePreferences />
      </div>
      <LegalPage
        doc={COOKIES}
        related={[
          { href: "/agb", label: "AGB" },
          { href: "/datenschutz", label: "Datenschutzerklärung" },
        ]}
      />
    </>
  );
}
