"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-10 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">Something went wrong</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">
        Sorry about that — please try again. If it keeps happening, let us know.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
