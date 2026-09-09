import type { Metadata } from "next";
import LegalPage from "@/components/site/LegalPage";
import { AGB } from "@/lib/legalContent";

export const metadata: Metadata = {
  title: "AGB",
  description: "Allgemeine Geschäftsbedingungen von FindMyTruck.",
};

export default function AgbPage() {
  return (
    <LegalPage
      doc={AGB}
      related={[
        { href: "/datenschutz", label: "Datenschutzerklärung" },
        { href: "/cookies", label: "Cookie-Hinweis" },
      ]}
    />
  );
}
