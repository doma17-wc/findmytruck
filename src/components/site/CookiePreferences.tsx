"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { getStoredConsent, setStoredConsent, type ConsentChoice } from "@/lib/cookieConsent";

const LABEL: Record<ConsentChoice, string> = {
  all: "Alle akzeptiert",
  necessary: "Nur notwendige",
};

/** Lets a visitor change their cookie choice any time, from the /cookies page
 *  itself — not just on the first-visit banner. */
export default function CookiePreferences() {
  const [choice, setChoice] = useState<ConsentChoice | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setChoice(getStoredConsent());
  }, []);

  const choose = (c: ConsentChoice) => {
    setStoredConsent(c);
    setChoice(c);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-card sm:p-5">
      <p className="text-sm font-bold text-neutral-900">Deine Auswahl</p>
      <p className="mt-1 text-[13.5px] text-neutral-500">
        Aktuell: <span className="font-semibold text-neutral-700">{choice ? LABEL[choice] : "noch nicht gewählt"}</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => choose("necessary")}
          className="rounded-xl border border-neutral-200 px-3.5 py-2 text-[13px] font-bold text-neutral-700 transition hover:border-neutral-300"
        >
          Nur notwendige
        </button>
        <button
          type="button"
          onClick={() => choose("all")}
          className="rounded-xl bg-brand px-3.5 py-2 text-[13px] font-bold text-white shadow-sm shadow-brand/30 transition hover:brightness-105"
        >
          Alle akzeptieren
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 self-center text-[13px] font-semibold text-live">
            <Check className="h-4 w-4" />
            Gespeichert
          </span>
        )}
      </div>
    </div>
  );
}
