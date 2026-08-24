import Link from "next/link";
import InstagramIcon from "@/components/icons/InstagramIcon";
import TikTokIcon from "@/components/icons/TikTokIcon";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
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
            <p className="mt-3 text-sm text-neutral-500">A product by Paolino Grand Cru GmbH</p>
            <p className="mt-1 text-sm text-neutral-500">Wolserstrasse, 8912 Obfelden, Switzerland</p>
            <p className="mt-1 text-sm text-neutral-500">CHE-358.850.974</p>
            <p className="mt-1 text-sm text-neutral-500">
              Contact:{" "}
              <a href="mailto:info@findmytruck.ch" className="font-medium text-neutral-700 hover:text-brand">
                info@findmytruck.ch
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

        <p className="mt-8 border-t border-neutral-100 pt-6 text-xs text-neutral-400">
          © 2026 FindMyTruck. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
