"use client";

import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import { sendContactMessageAction, type ContactFormState } from "@/app/(site)/contact/actions";

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[15px] transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-brand py-3 text-base font-bold text-white shadow-sm transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send message"}
    </button>
  );
}

export default function ContactForm() {
  const [state, formAction] = useFormState<ContactFormState, FormData>(
    sendContactMessageAction,
    {}
  );

  if (state.ok) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-green-100 bg-green-50 px-4 py-4 text-sm text-green-700">
        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div>
          <p className="font-semibold">Thanks, we&apos;ll get back to you soon.</p>
          <p className="mt-0.5 text-green-600">
            Your message is on its way to the FindMyTruck team.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <input name="name" placeholder="Your name (optional)" className={inputClass} />

      <input
        type="email"
        name="email"
        placeholder="Email"
        required
        autoComplete="email"
        className={inputClass}
      />

      <select name="type" defaultValue="" className={inputClass}>
        <option value="">What best describes you? (optional)</option>
        <option value="I'm a customer">I&apos;m a customer</option>
        <option value="I'm a food truck">I&apos;m a food truck</option>
        <option value="Partnership / other">Partnership / other</option>
      </select>

      <textarea
        name="message"
        placeholder="How can we help?"
        required
        rows={5}
        maxLength={5000}
        className={`${inputClass} resize-y`}
      />

      {/* Honeypot — hidden from real users, catches bots. */}
      <div aria-hidden="true" className="hidden">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <SubmitButton />

      <p className="text-xs leading-relaxed text-neutral-400">
        We&apos;ll only use your email to reply to this message.
      </p>
    </form>
  );
}
