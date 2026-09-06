"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, ChevronsUpDown, ExternalLink, Plus } from "lucide-react";
import type { OwnedTruckLite } from "@/lib/dashboardTruck";
import { selectTruckAction } from "@/app/dashboard/actions";
import { Beacon, cn } from "./ui";

const LS_KEY = "fmt_dash_truck";

export default function TruckSwitcher({
  current,
  owned,
  boosted,
  isActive,
}: {
  current: OwnedTruckLite;
  owned: OwnedTruckLite[];
  boosted: boolean;
  isActive: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const multi = owned.length > 1;

  // Keep localStorage in sync with the truck the server resolved.
  useEffect(() => {
    try {
      window.localStorage.setItem(LS_KEY, current.id);
    } catch {
      /* private mode / blocked storage — the cookie still carries it */
    }
  }, [current.id]);

  // First load with no explicit ?truck= — if the last truck we managed on this
  // device differs from the default the server picked, switch to it.
  useEffect(() => {
    if (searchParams.get("truck")) return;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(LS_KEY);
    } catch {
      stored = null;
    }
    if (stored && stored !== current.id && owned.some((t) => t.id === stored)) {
      switchTo(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchTo(id: string) {
    if (id === current.id) {
      setOpen(false);
      return;
    }
    try {
      window.localStorage.setItem(LS_KEY, id);
    } catch {
      /* ignore */
    }
    setOpen(false);
    startTransition(async () => {
      await selectTruckAction(id);
      router.push(`/dashboard?truck=${id}`);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl bg-white/5 p-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => multi && setOpen((v) => !v)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg text-left",
            multi && "px-1.5 py-1 transition hover:bg-white/5"
          )}
          aria-haspopup={multi ? "listbox" : undefined}
          aria-expanded={multi ? open : undefined}
          disabled={pending}
        >
          <Beacon live={boosted} />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{current.name}</span>
          {multi && <ChevronsUpDown className="h-4 w-4 flex-shrink-0 text-white/40" />}
        </button>

        {open && multi && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <ul
              role="listbox"
              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-xl border border-white/10 bg-ink p-1 shadow-xl"
            >
              {owned.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={t.id === current.id}
                    onClick={() => switchTo(t.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
                      t.id === current.id
                        ? "bg-white/10 font-semibold text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{t.name}</span>
                    {t.id === current.id && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <p className="mt-1 px-1.5 text-xs text-white/50">
        {boosted ? "Boosted now" : isActive ? "Listed · not boosted" : "Not listed"}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1.5">
        <Link
          href={`/trucks/${current.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1 text-xs font-medium text-white/60 transition hover:text-white"
        >
          View public profile <ExternalLink className="h-3 w-3" />
        </Link>
        <Link
          href="/dashboard/add-truck"
          className="inline-flex items-center gap-1 text-xs font-medium text-accent transition hover:text-accent/80"
        >
          <Plus className="h-3 w-3" /> Add another truck
        </Link>
      </div>
    </div>
  );
}
