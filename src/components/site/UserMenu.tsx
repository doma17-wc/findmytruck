"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, LayoutDashboard, LogOut, User as UserIcon } from "lucide-react";
import { signOutAction } from "@/app/(site)/auth-actions";
import type { AppProfile } from "@/lib/supabase/server";

interface UserMenuProps {
  email: string;
  profile: AppProfile | null;
}

export default function UserMenu({ email, profile }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const initial = (profile?.display_name || email || "?").trim().charAt(0).toUpperCase();
  const isOwner = profile?.role === "truck_owner";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white ring-2 ring-white/10 transition hover:brightness-110"
        aria-label="Account menu"
      >
        {initial}
      </button>

      {open && (
        <div className="dropdown-in absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-neutral-100 bg-white py-1.5 text-neutral-900 shadow-xl">
          <div className="border-b border-neutral-100 px-4 py-3">
            <p className="truncate text-sm font-semibold">{profile?.display_name || "Your account"}</p>
            <p className="truncate text-xs text-neutral-500">{email}</p>
          </div>

          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <UserIcon className="h-4 w-4 text-neutral-400" />
            Profile
          </Link>

          {isOwner ? (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <LayoutDashboard className="h-4 w-4 text-neutral-400" />
              Truck dashboard
            </Link>
          ) : (
            <Link
              href="/favorites"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Heart className="h-4 w-4 text-neutral-400" />
              My favorites
            </Link>
          )}

          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 border-t border-neutral-100 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
