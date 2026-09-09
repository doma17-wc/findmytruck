/**
 * Text content for the three legal pages (/agb, /datenschutz, /cookies).
 *
 * Each section's `body` is one or more paragraphs (plain strings — a blank
 * line between them). To update the text, just replace the string(s) in the
 * matching section's `body` array; nothing else needs to change, since the
 * page layout (LegalPage) renders whatever is here.
 */

export const COMPANY = {
  name: "Paolino Find My Truck (Einzelfirma)",
  owner: "Stefano Giuliano Paolino",
  address: "Wolserstrasse, 8912 Obfelden, Schweiz",
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

export const AGB: LegalDoc = {
  title: "Allgemeine Geschäftsbedingungen (AGB)",
  intro: "Diese AGB regeln die Nutzung von FindMyTruck durch Kund:innen und Truck-Betreiber:innen.",
  lastUpdated: "Stand: September 2026",
  sections: [
    {
      heading: "Geltungsbereich",
      body: [
        `Betreiber: ${COMPANY.name}, Inhaber ${COMPANY.owner}, ${COMPANY.address}. E-Mail: ${COMPANY.email}`,
        "Diese Allgemeinen Geschäftsbedingungen (AGB) regeln die Nutzung der Plattform FindMyTruck, erreichbar unter findmytruck.ch, betrieben durch Paolino Find My Truck. Mit der Nutzung der Plattform akzeptieren die Nutzer diese AGB. Die Plattform richtet sich an Foodtruck-Betreiber, die ein Profil erstellen und verwalten, sowie an Gäste, die Foodtrucks suchen, finden und mit ihnen interagieren.",
      ],
    },
    {
      heading: "Leistungsbeschreibung",
      body: [
        "FindMyTruck ist eine digitale Plattform, die Foodtrucks und ihre Gäste zusammenbringt. Sie ermöglicht die Anzeige von Standorten, Fahrplänen, Menüs und Öffnungszeiten, die Live-Standortanzeige (Boost) durch Truck-Betreiber, das Verwalten von Profilen, Bewertungen, Folgen und Benachrichtigungen sowie die Anzeige von Events und Catering-Angeboten. Wir stellen ausschliesslich die technische Plattform bereit und sind nicht Vertragspartei von Geschäften zwischen Gästen und Foodtrucks. Solche Verträge kommen ausschliesslich zwischen dem Gast und dem jeweiligen Foodtruck zustande.",
      ],
    },
    {
      heading: "Registrierung",
      body: [
        "Für bestimmte Funktionen ist ein Konto erforderlich. Nutzer machen wahrheitsgemässe Angaben und behandeln ihre Zugangsdaten vertraulich. Nutzer können ihr Konto jederzeit pausieren oder löschen. Truck-Betreiber sind für die Richtigkeit und Aktualität ihrer veröffentlichten Informationen selbst verantwortlich.",
      ],
    },
    {
      heading: "Pflichten",
      body: [
        "Die Nutzer verpflichten sich, die Plattform nicht missbräuchlich zu nutzen und keine rechtswidrigen, beleidigenden, irreführenden oder urheberrechtsverletzenden Inhalte zu veröffentlichen. Bewertungen müssen auf echten Erfahrungen beruhen. Wir behalten uns vor, Inhalte zu entfernen und Konten zu sperren, die gegen diese AGB verstossen.",
      ],
    },
    {
      heading: "Inhalte und Rechte",
      body: [
        "Truck-Betreiber räumen uns das Recht ein, ihre bereitgestellten Inhalte (Fotos, Texte, Menüs) im Rahmen des Plattformbetriebs anzuzeigen, und sichern zu, dass sie über die erforderlichen Rechte daran verfügen, insbesondere an hochgeladenen Fotos.",
      ],
    },
    {
      heading: "Haftung",
      body: [
        "Wir übernehmen keine Gewähr für die Richtigkeit, Vollständigkeit oder Aktualität der von Truck-Betreibern bereitgestellten Informationen. Die Nutzung erfolgt auf eigene Verantwortung. Soweit gesetzlich zulässig, ist unsere Haftung für leichte Fahrlässigkeit ausgeschlossen. Für Schäden aus Geschäften zwischen Gästen und Foodtrucks haften wir nicht.",
      ],
    },
    {
      heading: "Verfügbarkeit",
      body: [
        "Wir bemühen uns um eine hohe Verfügbarkeit, garantieren jedoch keinen unterbrechungsfreien Betrieb. Wartung, technische Störungen oder höhere Gewalt können zu Einschränkungen führen.",
      ],
    },
    {
      heading: "Änderungen",
      body: [
        "Wir können diese AGB jederzeit anpassen. Die aktuelle Fassung ist auf der Plattform abrufbar. Bei wesentlichen Änderungen informieren wir die registrierten Nutzer in geeigneter Form.",
      ],
    },
    {
      heading: "Recht und Gerichtsstand",
      body: [
        "Es gilt ausschliesslich schweizerisches Recht. Gerichtsstand ist Obfelden (Bezirk Affoltern, Kanton Zürich), soweit gesetzlich zulässig.",
      ],
    },
  ],
};

export const DATENSCHUTZ: LegalDoc = {
  title: "Datenschutzerklärung",
  intro: "Diese Erklärung beschreibt, welche Daten FindMyTruck erhebt, wofür sie genutzt werden und welche Rechte du hast.",
  lastUpdated: "Stand: September 2026",
  sections: [
    {
      heading: "Verantwortlicher",
      body: [
        `Verantwortlich für die Datenbearbeitung ist ${COMPANY.name}, ${COMPANY.owner}, ${COMPANY.address}. E-Mail: ${COMPANY.email}`,
      ],
    },
    {
      heading: "Welche Daten",
      body: [
        "Kontodaten (Name, E-Mail, verschlüsseltes Passwort, bei Truck-Betreibern Telefonnummer); Profildaten der Truck-Betreiber (Truck-Name, Beschreibung, Fotos, Menü, Standorte, Fahrpläne, Social-Media-Links); Nutzungsdaten (Standortdaten nur mit Zustimmung, Interaktionen wie Favoriten/Folgen und Bewertungen, angesehene Profile, technische Daten wie Geräte- und Browserinformationen, IP-Adresse, Zugriffszeiten, sowie aggregierte Statistiken wie Profilaufrufe und Impressionen).",
      ],
    },
    {
      heading: "Zwecke",
      body: [
        "Bereitstellung und Betrieb der Plattform, Anzeige von Trucks in der Nähe, Kontoverwaltung, Versand von Benachrichtigungen (sofern aktiviert), Verbesserung der Plattform und Verhinderung von Missbrauch.",
      ],
    },
    {
      heading: "Rechtsgrundlagen",
      body: [
        "Je nach Fall Ihre Einwilligung (z. B. Standort, Benachrichtigungen), die Erfüllung des Nutzungsvertrags oder unser überwiegendes berechtigtes Interesse (Sicherheit, Verbesserung).",
      ],
    },
    {
      heading: "Weitergabe",
      body: [
        "Wir geben Daten nur weiter, soweit für den Betrieb erforderlich, insbesondere an technische Dienstleister (Auftragsbearbeiter), die vertraglich zur Vertraulichkeit verpflichtet sind: Supabase (Datenbank und Authentifizierung), Vercel (Hosting und aggregierte Analyse), Mapbox (Kartendarstellung), Resend (E-Mail-Versand).",
      ],
    },
    {
      heading: "Ausland",
      body: [
        "Einige Dienstleister können Daten ausserhalb der Schweiz bearbeiten (z. B. EU oder USA). Wir stellen durch geeignete Massnahmen (z. B. Standardvertragsklauseln) ein angemessenes Datenschutzniveau sicher.",
      ],
    },
    {
      heading: "Aufbewahrung",
      body: [
        "Wir bewahren Daten nur so lange auf, wie für die Zwecke erforderlich oder gesetzlich vorgeschrieben. Bei Löschung Ihres Kontos werden Ihre Daten gelöscht oder anonymisiert (Bewertungen können anonymisiert bestehen bleiben).",
      ],
    },
    {
      heading: "Rechte",
      body: [
        `Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Herausgabe Ihrer Daten sowie auf Widerruf einer Einwilligung. Kontakt: ${COMPANY.email}. Sie können sich zudem beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) beschweren.`,
      ],
    },
    {
      heading: "Sicherheit",
      body: [
        "Wir treffen angemessene technische und organisatorische Massnahmen zum Schutz Ihrer Daten. Passwörter werden verschlüsselt gespeichert; die Übertragung erfolgt verschlüsselt (HTTPS).",
      ],
    },
    {
      heading: "Änderungen",
      body: [
        "Wir können diese Datenschutzerklärung anpassen. Es gilt die jeweils veröffentlichte Fassung.",
      ],
    },
  ],
};

export const COOKIES: LegalDoc = {
  title: "Cookie-Hinweis",
  intro: "So verwendet FindMyTruck Cookies und ähnliche Technologien — und wie du deine Wahl steuern kannst.",
  lastUpdated: "Stand: September 2026",
  sections: [
    {
      heading: "Notwendige",
      body: [
        "Erforderlich für den Betrieb, z. B. um Sie eingeloggt zu halten oder Einstellungen zu speichern (etwa den gewählten Truck im Dashboard oder die Sprachauswahl). Sie können nicht deaktiviert werden.",
      ],
    },
    {
      heading: "Analyse",
      body: [
        "Wir verwenden Analysewerkzeuge (z. B. Vercel Analytics / Speed Insights), um die Nutzung in aggregierter, weitgehend anonymer Form zu verstehen und die Plattform zu verbessern.",
      ],
    },
    {
      heading: "Verwaltung",
      body: [
        `Sie können Cookies in Ihren Browsereinstellungen verwalten oder löschen. Die Deaktivierung notwendiger Cookies kann die Funktionalität einschränken. Bei Fragen: ${COMPANY.email}`,
      ],
    },
  ],
};
