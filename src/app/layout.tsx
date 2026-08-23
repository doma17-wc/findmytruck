import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://findmytruck.ch"),
  title: {
    default: "FindMyTruck — Find food trucks near you in Zurich",
    template: "%s | FindMyTruck",
  },
  description:
    "Discover food trucks in Zurich in real time. See where they're parked today, check schedules, menus, and get directions.",
  openGraph: {
    siteName: "FindMyTruck",
    type: "website",
    locale: "en_CH",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
