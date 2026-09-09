"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Change-password form for both the customer `/account` page and the truck-owner
 * dashboard Settings panel. Runs entirely on the browser Supabase client (it
 * holds the session): re-authenticate with the current password to prove
 * identity, then `updateUser({ password })`.
 */
export default function ChangePasswordForm({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("The two new passwords don't match.");
      return;
    }
    if (next === current) {
      setError("Pick a password different from your current one.");
      return;
    }

    setStatus("saving");
    const supabase = createClient();

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (reauthError) {
      setStatus("idle");
      setError("Current password is incorrect.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: next });
    if (updateError) {
      setStatus("idle");
      setError(updateError.message);
      return;
    }

    setStatus("done");
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  const inputClass =
    "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[15px] text-neutral-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

  return (
    <form onSubmit={submit} className="space-y-3">
      {/* Hidden username field helps password managers associate the change. */}
      <input type="hidden" name="username" autoComplete="username" value={email} readOnly />

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-neutral-800">Current password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          className={inputClass}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-neutral-800">New password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-neutral-800">Confirm new password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className={inputClass}
          />
        </label>
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      {status === "done" && (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-green-700">
          <Check className="h-4 w-4" />
          Password updated.
        </p>
      )}

      <button
        type="submit"
        disabled={status === "saving"}
        className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {status === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
        Update password
      </button>
    </form>
  );
}
