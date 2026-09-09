"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import {
  getStoredConsent,
  setStoredConsent,
  OPEN_COOKIE_PREFS_EVENT,
  type ConsentChoice,
} from "@/lib/cookieConsent";

/** Same localStorage key + default as src/lib/i18n.tsx, read directly (not via
 *  useLang/LangProvider) since this banner renders in the root layout, outside
 *  the homepage's language context. */
const LANG_KEY = "fmt_lang";

const COPY = {
  en: {
    message: "We use cookies to run FindMyTruck. See our",
    linkLabel: "Cookie Notice",
    acceptAll: "Accept all",
    necessaryOnly: "Only necessary",
  },
  de: {
    message: "Wir verwenden Cookies für den Betrieb von FindMyTruck. Mehr dazu im",
    linkLabel: "Cookie-Hinweis",
    acceptAll: "Alle akzeptieren",
    necessaryOnly: "Nur notwendige",
  },
} as const;

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [lang, setLang] = useState<"en" | "de">("en");

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem(LANG_KEY);
      if (savedLang === "de" || savedLang === "en") setLang(savedLang);
    } catch {
      /* localStorage unavailable — stay on default */
    }
    setVisible(getStoredConsent() === null);

    const reopen = () => setVisible(true);
    window.addEventListener(OPEN_COOKIE_PREFS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_PREFS_EVENT, reopen);
  }, []);

  const choose = (choice: ConsentChoice) => {
    setStoredConsent(choice);
    setVisible(false);
  };

  if (!visible) return null;
  const t = COPY[lang];

  return (
    // bottom-20 clears the mobile BottomNav (h-16 + safe-area); it's md:hidden
    // so the banner drops back to flush-bottom once that nav disappears.
    <div className="fixed inset-x-0 bottom-20 z-50 px-3 md:bottom-0 md:pb-4 sm:px-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-card-hover sm:flex-row sm:items-center sm:gap-4 sm:p-4">
        <div className="flex items-start gap-2.5 sm:items-center">
          <Cookie className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand sm:mt-0" />
          <p className="text-[13.5px] leading-relaxed text-neutral-600">
            {t.message}{" "}
            <Link href="/cookies" className="font-medium text-brand hover:underline">
              {t.linkLabel}
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("necessary")}
            className="flex-1 whitespace-nowrap rounded-xl border border-neutral-200 px-3.5 py-2 text-[13px] font-bold text-neutral-700 transition hover:border-neutral-300 sm:flex-none"
          >
            {t.necessaryOnly}
          </button>
          <button
            type="button"
            onClick={() => choose("all")}
            className="flex-1 whitespace-nowrap rounded-xl bg-brand px-3.5 py-2 text-[13px] font-bold text-white shadow-sm shadow-brand/30 transition hover:brightness-105 sm:flex-none"
          >
            {t.acceptAll}
          </button>
        </div>
      </div>
    </div>
  );
}
