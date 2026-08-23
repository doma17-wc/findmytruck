"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { signUpCustomerAction, type AuthFormState } from "@/app/(site)/auth-actions";

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
      {pending ? "Creating account…" : "Create account"}
    </button>
  );
}

export default function SignupForm() {
  const [state, formAction] = useFormState<AuthFormState, FormData>(signUpCustomerAction, {});

  return (
    <div>
      <form action={formAction} className="space-y-3">
        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
        )}
        {state.message && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.message}</p>
        )}
        <input name="display_name" placeholder="Name" className={inputClass} />
        <input type="email" name="email" placeholder="Email" required className={inputClass} />
        <input
          type="password"
          name="password"
          placeholder="Password (min. 6 characters)"
          required
          minLength={6}
          className={inputClass}
        />
        <SubmitButton />
      </form>

      <div className="mt-6 space-y-1.5 text-center text-sm text-neutral-500">
        <p>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand">
            Sign in
          </Link>
        </p>
        <p>
          Own a food truck?{" "}
          <Link href="/register-truck" className="font-semibold text-brand">
            Register your truck
          </Link>
        </p>
      </div>
    </div>
  );
}
