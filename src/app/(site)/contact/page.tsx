import type { Metadata } from "next";
import ContactForm from "@/components/site/ContactForm";
import { COMPANY } from "@/lib/legalContent";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-neutral-900">
        Contact
      </h1>
      <p className="mt-2 text-[15px] text-neutral-600">
        Question, feedback, or want to get your food truck listed? Send us a note and we&apos;ll get
        back to you.
      </p>

      <div className="mt-6 rounded-2xl border border-neutral-100 bg-white p-5 shadow-card sm:p-6">
        <ContactForm />
      </div>

      <div className="mt-8 border-t border-neutral-100 pt-6 text-[15px] text-neutral-600">
        <p className="font-semibold text-neutral-800">{COMPANY.name}</p>
        <p className="mt-1">{COMPANY.address}</p>
        <p className="pt-2">
          Email:{" "}
          <a
            href={`mailto:${COMPANY.email}`}
            className="font-medium text-brand hover:underline"
          >
            {COMPANY.email}
          </a>
        </p>
      </div>
    </div>
  );
}
