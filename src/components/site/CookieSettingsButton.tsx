"use client";

import { OPEN_COOKIE_PREFS_EVENT } from "@/lib/cookieConsent";

/** Reopens the cookie banner from anywhere on the site (footer link). */
export default function CookieSettingsButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_COOKIE_PREFS_EVENT))}
      className={className}
    >
      {children}
    </button>
  );
}
