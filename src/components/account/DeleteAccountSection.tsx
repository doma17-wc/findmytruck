"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { deleteMyAccountAction } from "@/app/(site)/account-actions";

export default function DeleteAccountSection({
  role,
}: {
  role: "customer" | "truck_owner";
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const isOwner = role === "truck_owner";
  const canDelete = confirmText.trim().toUpperCase() === "DELETE";

  const runDelete = () => {
    if (!canDelete) return;
    setError(null);
    start(async () => {
      const res = await deleteMyAccountAction();
      // On success the action redirects; only an error comes back here.
      if (res?.error) setError(res.error);
    });
  };

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/40 p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-red-700">
        <AlertTriangle className="h-[18px] w-[18px]" />
        Delete account
      </h2>

      {!open ? (
        <>
          <p className="mt-2 text-sm text-neutral-600">
            {isOwner
              ? "Permanently deletes your login. Your truck profile(s) stay online but become unclaimed — you'd need to re-claim to manage them again."
              : "Permanently deletes your account, your follows and your event RSVPs. Reviews you wrote are kept but shown as “Former guest”."}{" "}
            This cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-3 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-600 hover:text-white"
          >
            Delete my account
          </button>
        </>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-sm font-semibold text-neutral-800">
            Type <span className="font-mono text-red-600">DELETE</span> to confirm. This is
            permanent.
          </p>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoFocus
            aria-label="Type DELETE to confirm"
            className="w-full max-w-[220px] rounded-xl border border-red-300 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
          />
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canDelete || pending}
              onClick={runDelete}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Permanently delete
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmText("");
                setError(null);
              }}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-neutral-500 hover:text-neutral-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
