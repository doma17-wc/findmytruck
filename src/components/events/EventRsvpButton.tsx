"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleEventRsvpAction } from "@/app/(site)/events-actions";

interface Props {
  eventId: string;
  initialInterested: boolean;
  initialCount: number;
  signedIn: boolean;
  variant?: "chip" | "full";
}

export default function EventRsvpButton({
  eventId,
  initialInterested,
  initialCount,
  signedIn,
  variant = "chip",
}: Props) {
  const [interested, setInterested] = useState(initialInterested);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const next = !interested;
    setInterested(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    startTransition(async () => {
      const res = await toggleEventRsvpAction(eventId, interested);
      if (res.error) {
        setInterested(!next);
        setCount((c) => Math.max(0, c + (next ? -1 : 1)));
      }
    });
  };

  const label = count === 1 ? "1 interested" : `${count} interested`;

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-pressed={interested}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-70 ${
          interested
            ? "bg-brand text-white hover:bg-brand-600"
            : "border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
        }`}
      >
        <Heart className="h-4 w-4" fill={interested ? "currentColor" : "none"} strokeWidth={2} />
        {interested ? "I'm interested" : "I'm interested"}
        <span className="opacity-70">· {count}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={interested}
      title={interested ? "Remove your interest" : "Mark yourself interested"}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition disabled:opacity-70 ${
        interested
          ? "bg-brand text-white"
          : "bg-neutral-100 text-neutral-600 hover:bg-brand-50 hover:text-brand-700"
      }`}
    >
      <Heart className="h-3.5 w-3.5" fill={interested ? "currentColor" : "none"} strokeWidth={2} />
      {label}
    </button>
  );
}
