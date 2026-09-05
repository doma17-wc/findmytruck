"use client";

import { useState } from "react";
import Link from "next/link";
import UserMenu from "@/components/site/UserMenu";
import type { AppProfile } from "@/lib/supabase/server";

interface DiscoverHeaderProps {
  auth: { email: string; profile: AppProfile | null } | null;
}

export default function DiscoverHeader({ auth }: DiscoverHeaderProps) {
  const [lang, setLang] = useState<"DE" | "EN">("EN");
  const isOwner = auth?.profile?.role === "truck_owner";

  return (
    <header className="z-40 flex h-14 flex-shrink-0 items-center justify-between border-b border-line bg-paper px-4">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-base shadow-sm shadow-brand/30">
            🚚
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight text-ink">
            Find<span className="text-brand">My</span>Truck
          </span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          <Link
            href="/zurich"
            className="text-sm font-medium text-ink-soft transition hover:text-brand"
          >
            Browse all
          </Link>
          <Link
            href="/events"
            className="text-sm font-medium text-ink-soft transition hover:text-brand"
          >
            Events
          </Link>
          {isOwner ? (
            <Link
              href="/dashboard"
              className="text-sm font-medium text-ink-soft transition hover:text-brand"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/register-truck"
              className="text-sm font-medium text-ink-soft transition hover:text-brand"
            >
              For truck owners
            </Link>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden overflow-hidden rounded-full border border-line text-xs font-bold sm:flex">
          {(["DE", "EN"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`px-2.5 py-1 transition ${
                lang === l ? "bg-ink text-white" : "text-muted hover:text-ink"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {auth ? (
          <UserMenu email={auth.email} profile={auth.profile} />
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-ink-soft transition hover:text-ink"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-brand px-3.5 py-1.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
