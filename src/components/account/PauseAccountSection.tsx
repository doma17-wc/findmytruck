"use client";

import { useState, useTransition } from "react";
import { Loader2, PauseCircle, PlayCircle } from "lucide-react";
import { setAccountDeactivatedAction } from "@/app/(site)/account-actions";

export default function PauseAccountSection({ initialPaused }: { initialPaused: boolean }) {
  const [paused, setPaused] = useState(initialPaused);
  const [pending, start] = useTransition();

  const set = (next: boolean) => {
    setPaused(next);
    start(async () => {
      const res = await setAccountDeactivatedAction(next);
      if (res.error) setPaused(!next);
    });
  };

  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
      <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
        {paused ? (
          <PlayCircle className="h-[18px] w-[18px] text-brand" />
        ) : (
          <PauseCircle className="h-[18px] w-[18px] text-brand" />
        )}
        {paused ? "Account paused" : "Pause account"}
      </h2>
      <p className="mt-2 text-sm text-neutral-600">
        {paused
          ? "We've stopped all notifications and e-mails. Your follows and reviews are kept and nothing is deleted."
          : "Stops all notifications and e-mails from us. Your follows and reviews stay saved. Turn it back on any time."}
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => set(!paused)}
        className={`mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition disabled:opacity-60 ${
          paused
            ? "bg-brand text-white hover:brightness-110"
            : "border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
        }`}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {paused ? "Reactivate account" : "Pause my account"}
      </button>
    </div>
  );
}
