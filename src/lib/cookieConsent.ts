/** Cookie-consent choice, persisted client-side only (no server call, no
 *  cookie of its own) — Swiss revDSG-friendly: nothing is sent anywhere,
 *  we just remember the visitor's choice for next time. */
export type ConsentChoice = "all" | "necessary";

const STORAGE_KEY = "fmt_cookie_consent";

/** Fired on `window` whenever the stored choice changes, so any open tab /
 *  component (e.g. the /cookies preferences panel) can react without a reload. */
export const COOKIE_CONSENT_EVENT = "fmt:cookie-consent-changed";

/** Fired to ask the banner to reopen (e.g. a "change cookie settings" footer link). */
export const OPEN_COOKIE_PREFS_EVENT = "fmt:open-cookie-prefs";

export function getStoredConsent(): ConsentChoice | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "all" || v === "necessary" ? v : null;
  } catch {
    return null;
  }
}

export function setStoredConsent(choice: ConsentChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* localStorage unavailable — choice just won't be remembered next visit */
  }
  try {
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: choice }));
  } catch {
    /* ignore */
  }
}
