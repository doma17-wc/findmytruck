/**
 * Text content for the three legal pages (/agb, /datenschutz, /cookies).
 *
 * Everything below is a PLACEHOLDER draft, not reviewed legal text. Each
 * section's `body` is one or more paragraphs (plain strings — a blank line
 * between them). To drop in the real German text, just replace the string(s)
 * in the matching section's `body` array; nothing else needs to change,
 * since the page layout (LegalPage) renders whatever is here.
 */

export const COMPANY = {
  name: "Paolino Grand Cru GmbH",
  address: "Wolserstrasse, 8912 Obfelden, Schweiz",
  uid: "CHE-358.850.974",
  email: "info@findmytruck.ch",
};

export interface LegalSection {
  /** Used for the anchor id and the in-page table of contents. */
  heading: string;
  body: string[];
}

export interface LegalDoc {
  title: string;
  /** Short one-line summary shown under the title. */
  intro: string;
  /** "Stand: ..." — update whenever the real text is dropped in. */
  lastUpdated: string;
  sections: LegalSection[];
}

const PLACEHOLDER =
  "Platzhaltertext — dieser Abschnitt wird mit dem finalen, rechtlich geprüften Text ersetzt.";

export const AGB: LegalDoc = {
  title: "Allgemeine Geschäftsbedingungen (AGB)",
  intro: "Diese AGB regeln die Nutzung von FindMyTruck durch Kund:innen und Truck-Betreiber:innen.",
  lastUpdated: "Entwurf — noch nicht final",
  sections: [
    {
      heading: "Geltungsbereich",
      body: [
        `Diese AGB gelten für die Nutzung der Plattform FindMyTruck, betrieben von ${COMPANY.name} (${COMPANY.address}, ${COMPANY.uid}), durch Besucher:innen, registrierte Kund:innen und Food-Truck-Betreiber:innen.`,
        PLACEHOLDER,
      ],
    },
    { heading: "Leistungsbeschreibung", body: [PLACEHOLDER] },
    { heading: "Registrierung", body: [PLACEHOLDER] },
    { heading: "Pflichten", body: [PLACEHOLDER] },
    { heading: "Inhalte und Rechte", body: [PLACEHOLDER] },
    { heading: "Haftung", body: [PLACEHOLDER] },
    { heading: "Verfügbarkeit", body: [PLACEHOLDER] },
    { heading: "Änderungen", body: [PLACEHOLDER] },
    {
      heading: "Recht und Gerichtsstand",
      body: [
        "Es gilt schweizerisches Recht.",
        PLACEHOLDER,
      ],
    },
  ],
};

export const DATENSCHUTZ: LegalDoc = {
  title: "Datenschutzerklärung",
  intro: "Diese Erklärung beschreibt, welche Daten FindMyTruck erhebt, wofür sie genutzt werden und welche Rechte du hast.",
  lastUpdated: "Entwurf — noch nicht final",
  sections: [
    {
      heading: "Verantwortlicher",
      body: [
        `Verantwortlich für die Datenbearbeitung ist ${COMPANY.name}, ${COMPANY.address} (${COMPANY.uid}). Kontakt: ${COMPANY.email}.`,
      ],
    },
    { heading: "Welche Daten", body: [PLACEHOLDER] },
    { heading: "Zwecke", body: [PLACEHOLDER] },
    { heading: "Rechtsgrundlagen", body: [PLACEHOLDER] },
    { heading: "Weitergabe", body: [PLACEHOLDER] },
    { heading: "Ausland", body: [PLACEHOLDER] },
    { heading: "Aufbewahrung", body: [PLACEHOLDER] },
    {
      heading: "Rechte",
      body: [
        `Du kannst jederzeit Auskunft, Berichtigung oder Löschung deiner Daten verlangen — schreib uns dazu an ${COMPANY.email}.`,
        PLACEHOLDER,
      ],
    },
    { heading: "Sicherheit", body: [PLACEHOLDER] },
    { heading: "Änderungen", body: [PLACEHOLDER] },
  ],
};

export const COOKIES: LegalDoc = {
  title: "Cookie-Hinweis",
  intro: "So verwendet FindMyTruck Cookies und ähnliche Technologien — und wie du deine Wahl steuern kannst.",
  lastUpdated: "Entwurf — noch nicht final",
  sections: [
    {
      heading: "Notwendige",
      body: [
        "Notwendige Cookies sind für den Betrieb von FindMyTruck erforderlich (z. B. Anmeldung, Spracheinstellung, Cookie-Einwilligung selbst) und können nicht deaktiviert werden.",
        PLACEHOLDER,
      ],
    },
    {
      heading: "Analyse",
      body: [
        PLACEHOLDER,
      ],
    },
    {
      heading: "Verwaltung",
      body: [
        "Beim ersten Besuch kannst du zwischen „Alle akzeptieren“ und „Nur notwendige“ wählen. Deine Wahl wird lokal in deinem Browser gespeichert.",
        PLACEHOLDER,
      ],
    },
  ],
};
