"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { signInAction, signInWithMagicLinkAction, type AuthFormState } from "@/app/(site)/auth-actions";

const inputClass =
  "w-full rounded-xl border border-neutral-200 px-4 py-3 text-[15px] transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-brand py-3 text-base font-bold text-white shadow-sm transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export default function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [passwordState, passwordAction] = useFormState<AuthFormState, FormData>(signInAction, {});
  const [magicState, magicAction] = useFormState<AuthFormState, FormData>(
    signInWithMagicLinkAction,
    {}
  );

  return (
    <div>
      <div className="mb-5 flex rounded-xl bg-neutral-100 p-1">
        <button
          type="button"
          onClick={() => setMode("password")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
            mode === "password" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => setMode("magic")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
            mode === "magic" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
          }`}
        >
          Magic link
        </button>
      </div>

      {mode === "password" ? (
        <form action={passwordAction} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          {passwordState.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {passwordState.error}
            </p>
          )}
          <input type="email" name="email" placeholder="Email" required className={inputClass} />
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            className={inputClass}
          />
          <SubmitButton label="Sign in" pendingLabel="Signing in…" />
        </form>
      ) : (
        <form action={magicAction} className="space-y-3">
          {magicState.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{magicState.error}</p>
          )}
          {magicState.message && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              {magicState.message}
            </p>
          )}
          <input type="email" name="email" placeholder="Email" required className={inputClass} />
          <SubmitButton label="Send magic link" pendingLabel="Sending…" />
        </form>
      )}

      <div className="mt-6 space-y-1.5 text-center text-sm text-neutral-500">
        <p>
          New here?{" "}
          <Link href="/signup" className="font-semibold text-brand">
            Create an account
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
