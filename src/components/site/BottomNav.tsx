"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Map, Search, User } from "lucide-react";
import type { AppProfile } from "@/lib/supabase/server";

interface BottomNavProps {
  auth: { user: { email?: string }; profile: AppProfile | null } | null;
}

export default function BottomNav({ auth }: BottomNavProps) {
  const pathname = usePathname();

  const profileHref = !auth ? "/login?next=/account" : "/account";

  const items = [
    { href: "/", label: "Map", icon: Map, match: (p: string) => p === "/" },
    { href: "/zurich", label: "Search", icon: Search, match: (p: string) => p.startsWith("/zurich") },
    {
      href: auth ? "/favorites" : "/login?next=/favorites",
      label: "Favorites",
      icon: Heart,
      match: (p: string) => p.startsWith("/favorites"),
    },
    { href: profileHref, label: "Profile", icon: User, match: (p: string) => p.startsWith("/account") || p.startsWith("/dashboard") },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur-sm md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex h-16 max-w-md items-center justify-around">
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={label}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2 transition active:scale-95"
            >
              <Icon
                className="h-[22px] w-[22px]"
                strokeWidth={active ? 2.5 : 2}
                color={active ? "#FF6A00" : "#9CA3AF"}
              />
              <span
                className={`text-[11px] font-medium ${active ? "text-brand" : "text-neutral-400"}`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
