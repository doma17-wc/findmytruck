"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { setNotifyPreferenceAction } from "@/app/(site)/notification-actions";

export default function NotifyPreferenceToggle({ initialOn }: { initialOn: boolean }) {
  const [on, setOn] = useState(initialOn);
  const [pending, start] = useTransition();

  const toggle = () => {
    const next = !on;
    setOn(next);
    start(async () => {
      const res = await setNotifyPreferenceAction(next);
      if (res.error) setOn(!next);
    });
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-neutral-900">
          Notify me when trucks I follow go live
        </p>
        <p className="mt-0.5 text-xs text-neutral-500">
          {pending ? "Saving…" : on ? "On — you'll get an e-mail + in-app alert" : "Off"}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        disabled={pending}
        className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition ${
          on ? "bg-brand" : "bg-neutral-300"
        } disabled:opacity-60`}
      >
        {pending && (
          <Loader2 className="absolute left-1/2 h-3 w-3 -translate-x-1/2 animate-spin text-white" />
        )}
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            on ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
