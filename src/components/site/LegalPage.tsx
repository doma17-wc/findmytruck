import Link from "next/link";
import type { LegalDoc } from "@/lib/legalContent";

const UMLAUT_MAP: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };

function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[äöüß]/g, (ch) => UMLAUT_MAP[ch])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Shared layout for /agb, /datenschutz, /cookies. Renders a doc from
 * src/lib/legalContent.ts with a desktop table-of-contents rail and a
 * mobile-friendly collapsible one, so long legal text stays navigable on a
 * phone without needing to scroll blind.
 */
export default function LegalPage({ doc, related }: { doc: LegalDoc; related: { href: string; label: string }[] }) {
  const toc = doc.sections.map((s) => ({ heading: s.heading, id: slugify(s.heading) }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-neutral-900">
          {doc.title}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">{doc.intro}</p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          {doc.lastUpdated}
        </p>
      </header>

      {/* Mobile TOC — collapsible so it doesn't push the content down on a phone. */}
      <details className="mt-6 rounded-2xl border border-neutral-100 bg-white p-4 shadow-card lg:hidden">
        <summary className="cursor-pointer text-sm font-bold text-neutral-900">
          Inhaltsverzeichnis
        </summary>
        <nav className="mt-3 flex flex-col gap-1.5">
          {toc.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="text-[14px] text-neutral-600 transition hover:text-brand"
            >
              {item.heading}
            </a>
          ))}
        </nav>
      </details>

      <div className="mt-8 grid gap-10 lg:grid-cols-[220px_1fr]">
        {/* Desktop TOC rail */}
        <nav className="hidden lg:block">
          <div className="sticky top-24 flex flex-col gap-1 border-l border-neutral-200 pl-4">
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="py-1 text-[13px] font-medium text-neutral-500 transition hover:text-brand"
              >
                {item.heading}
              </a>
            ))}
          </div>
        </nav>

        <div className="min-w-0 space-y-9">
          {doc.sections.map((section, i) => {
            const id = slugify(section.heading);
            return (
              <section key={id} id={id} className="scroll-mt-24">
                <h2 className="flex items-center gap-2.5 font-display text-lg font-bold text-neutral-900">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-[12px] font-bold text-brand">
                    {i + 1}
                  </span>
                  {section.heading}
                </h2>
                <div className="mt-2.5 space-y-3 pl-[34px] text-[15px] leading-relaxed text-neutral-600">
                  {section.body.map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </div>
              </section>
            );
          })}

          <div className="border-t border-neutral-100 pt-6 text-[14px] text-neutral-500">
            Fragen dazu? Schreib uns an{" "}
            <a href="mailto:info@findmytruck.ch" className="font-medium text-brand hover:underline">
              info@findmytruck.ch
            </a>
            .
          </div>

          {related.length > 0 && (
            <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-neutral-100 pt-6 text-[13px] font-medium">
              {related.map((r) => (
                <Link key={r.href} href={r.href} className="text-neutral-500 transition hover:text-brand">
                  {r.label} →
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
