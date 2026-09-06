"use client";

/**
 * Minimal language layer for the discovery homepage.
 *
 * There is no full app-wide i18n system — this only covers the copy introduced
 * by the day-selector / planning reframe. Everything else on the site stays
 * English. Default is "en"; the DE/EN toggle in the header flips it and the
 * choice is remembered in localStorage.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "de";

const STORAGE_KEY = "fmt_lang";

type Vars = Record<string, string | number>;

/** Only NEW / reframed copy lives here. Keys missing from `de` fall back to `en`. */
const DICT: Record<Lang, Record<string, string>> = {
  en: {
    headline: "Discover food trucks near you — see where they'll be and when",
    today: "Today",
    tomorrow: "Tomorrow",
    pickDate: "Pick a date",
    planned: "Planned",
    liveOnlyToday: "Only Today shows live open / boosted status.",
    trucksOut: "{n} truck{s} out {day}",
    noTrucksDay: "No trucks out {day} yet — try another day.",
    noMatch: "No trucks match your filters.",
    eventsUpcoming: "Events coming up",
    eventsOnDay: "Events · {day}",
    laterToday: "Later today",
    // meal-time hints
    mealBreakfast: "breakfast",
    mealLunch: "lunch",
    mealDinner: "dinner",
    mealEvening: "evening",
    // "{day}, {meal} · {location} {range}"  → forward-looking invitation
    nextAtMeal: "{day}, {meal} · {location} {range}",
  },
  de: {
    headline: "Entdecke Food Trucks in deiner Nähe — sieh, wo sie wann stehen",
    today: "Heute",
    tomorrow: "Morgen",
    pickDate: "Datum wählen",
    planned: "Geplant",
    liveOnlyToday: "Nur „Heute“ zeigt den Live-Status (offen / geboostet).",
    trucksOut: "{n} Truck{s} {day} unterwegs",
    noTrucksDay: "{day} ist noch kein Truck unterwegs — probier einen anderen Tag.",
    noMatch: "Keine Trucks passen zu deinen Filtern.",
    eventsUpcoming: "Demnächst",
    eventsOnDay: "Events · {day}",
    laterToday: "Später heute",
    mealBreakfast: "zum Frühstück",
    mealLunch: "mittags",
    mealDinner: "abends",
    mealEvening: "am Abend",
    nextAtMeal: "{day} {meal} · {location} {range}",
  },
};

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`
  );
}

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Vars) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Read the saved preference after mount so SSR + first render stay "en"
  // (no hydration mismatch); DE users get a one-frame swap.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "de" || saved === "en") setLangState(saved);
    } catch {
      /* localStorage unavailable — stay on default */
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Vars) => {
      const template = DICT[lang][key] ?? DICT.en[key] ?? key;
      return interpolate(template, vars);
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) {
    // Safe fallback for any consumer rendered outside the provider.
    return {
      lang: "en",
      setLang: () => {},
      t: (key: string, vars?: Vars) => interpolate(DICT.en[key] ?? key, vars),
    };
  }
  return ctx;
}

/** Locale-correct weekday name — no hand-maintained translation table. */
export function weekdayName(
  date: Date,
  lang: Lang,
  width: "short" | "long" = "short"
): string {
  return new Intl.DateTimeFormat(lang === "de" ? "de-CH" : "en-GB", {
    weekday: width,
  }).format(date);
}

/** "27.9." (de) / "27 Sep" (en) — compact date for a far-off chip. */
export function shortDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "de" ? "de-CH" : "en-GB", {
    day: "numeric",
    month: lang === "de" ? "numeric" : "short",
  }).format(date);
}
