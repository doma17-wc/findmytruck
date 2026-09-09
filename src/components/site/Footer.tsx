import Link from "next/link";
import InstagramIcon from "@/components/icons/InstagramIcon";
import TikTokIcon from "@/components/icons/TikTokIcon";
import CookieSettingsButton from "./CookieSettingsButton";
import { COMPANY } from "@/lib/legalContent";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/events", label: "Events" },
  { href: "/catering", label: "Catering" },
  { href: "/contact", label: "Contact" },
];

const LEGAL_LINKS = [
  { href: "/agb", label: "AGB" },
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/cookies", label: "Cookies" },
];

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-base shadow-sm shadow-brand/30">
                🚚
              </span>
              <span className="text-lg font-extrabold tracking-tight text-neutral-900">
                Find<span className="text-brand">My</span>Truck
              </span>
            </Link>
            <p className="mt-3 text-sm text-neutral-500">A product by {COMPANY.name}</p>
            <p className="mt-1 text-sm text-neutral-500">{COMPANY.address}</p>
            <p className="mt-1 text-sm text-neutral-500">
              Contact:{" "}
              <a href={`mailto:${COMPANY.email}`} className="font-medium text-neutral-700 hover:text-brand">
                {COMPANY.email}
              </a>
            </p>
          </div>

          <div className="flex flex-col gap-6 sm:items-end">
            <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-neutral-600 sm:justify-end">
              {LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="transition hover:text-brand">
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <span
                title="Instagram (coming soon)"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-400"
              >
                <InstagramIcon className="h-[18px] w-[18px]" />
              </span>
              <span
                title="TikTok (coming soon)"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-400"
              >
                <TikTokIcon className="h-[16px] w-[16px]" />
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-neutral-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-400">© 2026 FindMyTruck. All rights reserved.</p>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-neutral-500">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-brand">
                {link.label}
              </Link>
            ))}
            <CookieSettingsButton className="transition hover:text-brand">
              Cookie-Einstellungen
            </CookieSettingsButton>
          </nav>
        </div>
      </div>
    </footer>
  );
}
