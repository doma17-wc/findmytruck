import Link from "next/link";
import UserMenu from "./UserMenu";
import type { AppProfile } from "@/lib/supabase/server";

interface HeaderProps {
  auth: { user: { email?: string }; profile: AppProfile | null } | null;
}

export default function Header({ auth }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-neutral-950/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-base shadow-sm shadow-brand/30">
            🚚
          </span>
          <span className="text-lg font-extrabold tracking-tight text-white">
            Find<span className="text-brand">My</span>Truck
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/zurich"
            className="text-sm font-medium text-neutral-300 transition hover:text-white"
          >
            Browse all trucks
          </Link>
          {auth?.profile?.role === "truck_owner" && (
            <Link
              href="/dashboard"
              className="text-sm font-medium text-neutral-300 transition hover:text-white"
            >
              Dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {auth ? (
            <UserMenu email={auth.user.email ?? ""} profile={auth.profile} />
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-neutral-200 transition hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-brand px-3.5 py-1.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
