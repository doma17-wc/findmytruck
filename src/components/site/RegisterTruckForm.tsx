"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { registerTruckOwnerAction, type AuthFormState } from "@/app/(site)/auth-actions";

const inputClass =
  "w-full rounded-xl border border-neutral-200 px-4 py-3 text-[15px] transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-brand py-3 text-base font-bold text-white shadow-sm transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "Setting up your truck…" : "Register my truck"}
    </button>
  );
}

export default function RegisterTruckForm() {
  const [state, formAction] = useFormState<AuthFormState, FormData>(registerTruckOwnerAction, {});

  return (
    <div>
      <form action={formAction} className="space-y-3">
        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
        )}
        {state.message && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.message}</p>
        )}
        <input
          name="truck_name"
          placeholder="Truck name (e.g. Smash Brothers)"
          required
          className={inputClass}
        />
        <input type="email" name="email" placeholder="Email" required className={inputClass} />
        <input
          type="password"
          name="password"
          placeholder="Password (min. 6 characters)"
          required
          minLength={6}
          className={inputClass}
        />
        <p className="text-xs leading-relaxed text-neutral-400">
          If a truck with this exact name already exists on FindMyTruck, this will claim it. Otherwise
          we&apos;ll create a new listing for you.
        </p>
        <SubmitButton />
      </form>

      <div className="mt-6 space-y-1.5 text-center text-sm text-neutral-500">
        <p>
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-brand">
            Sign in
          </Link>
        </p>
        <p>
          Looking to browse instead?{" "}
          <Link href="/signup" className="font-semibold text-brand">
            Create a customer account
          </Link>
        </p>
      </div>
    </div>
  );
}
