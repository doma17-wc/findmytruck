"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { claimTruckAction, type ClaimFormState } from "@/app/(site)/claim/actions";

const inputClass =
  "w-full rounded-xl border border-neutral-200 px-4 py-3 text-[15px] transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

function SubmitButton({ signedIn }: { signedIn: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-brand py-3 text-base font-bold text-white shadow-sm transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "Submitting…" : signedIn ? "Claim this profile" : "Create account & claim"}
    </button>
  );
}

export default function ClaimForm({
  slug,
  truckName,
  signedIn,
}: {
  slug: string;
  truckName: string;
  signedIn: boolean;
}) {
  const action = claimTruckAction.bind(null, slug);
  const [state, formAction] = useFormState<ClaimFormState, FormData>(action, {});

  return (
    <div>
      <form action={formAction} className="space-y-3">
        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
        )}
        {state.message && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.message}</p>
        )}

        {!signedIn && (
          <>
            <input type="email" name="email" placeholder="Email" required className={inputClass} />
            <input
              type="password"
              name="password"
              placeholder="Create a password (min. 6 characters)"
              required
              minLength={6}
              className={inputClass}
            />
          </>
        )}

        <label className="flex items-start gap-2.5 rounded-xl bg-neutral-50 px-3 py-3 text-sm text-neutral-600">
          <input
            type="checkbox"
            name="confirm_owner"
            required
            className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
          />
          <span>
            I confirm that I own or officially represent <strong>{truckName}</strong>.
          </span>
        </label>

        <p className="text-xs leading-relaxed text-neutral-400">
          Your claim is reviewed by our team before the profile is marked verified. You&apos;ll get
          dashboard access right away to start editing.
        </p>

        <SubmitButton signedIn={signedIn} />
      </form>

      {!signedIn && (
        <p className="mt-6 text-center text-sm text-neutral-500">
          Already have an account?{" "}
          <Link href={`/login?next=/claim/${slug}`} className="font-semibold text-brand">
            Sign in first
          </Link>
        </p>
      )}
    </div>
  );
}
