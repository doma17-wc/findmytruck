"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { setReviewsRequireLoginAction } from "@/app/admin/actions";
import { Card } from "./ui";

export default function SettingsTab({
  reviewsRequireLogin,
}: {
  reviewsRequireLogin: boolean;
}) {
  const [on, setOn] = useState(reviewsRequireLogin);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = () => {
    const next = !on;
    setOn(next);
    setError(null);
    start(async () => {
      const res = await setReviewsRequireLoginAction(next);
      if (res && "error" in res && res.error) {
        setError(res.error);
        setOn(!next);
      }
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-extrabold text-ink">Platform settings</h1>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-base font-bold text-ink">Reviews require login</p>
            <p className="mt-1 text-sm text-ink-soft">
              When <strong>on</strong>, only signed-in customers can leave a review. When{" "}
              <strong>off</strong> (default), anyone can review — they just enter a name.
              Anti-spam (honeypot, rate limit, one review per person per truck per day) applies
              either way.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={toggle}
            disabled={pending}
            className={`relative mt-1 inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition ${
              on ? "bg-accent" : "bg-line"
            } disabled:opacity-60`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                on ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted">
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Currently: {on ? "login required" : "open to everyone"}
        </div>
        {error && <p className="mt-2 text-sm text-accent-dark">{error}</p>}
      </Card>
    </div>
  );
}
