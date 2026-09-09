import type { Metadata } from "next";
import LegalPage from "@/components/site/LegalPage";
import { DATENSCHUTZ } from "@/lib/legalContent";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description: "Wie FindMyTruck Daten erhebt, nutzt und schützt.",
};

export default function DatenschutzPage() {
  return (
    <LegalPage
      doc={DATENSCHUTZ}
      related={[
        { href: "/agb", label: "AGB" },
        { href: "/cookies", label: "Cookie-Hinweis" },
      ]}
    />
  );
}
