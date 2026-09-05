"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types";

/** Bell + dropdown feed of the signed-in user's notifications. Reads straight
 *  from Supabase (RLS scopes rows to the current user); marks everything read
 *  when the panel is opened. Render only when the user is signed in. */
export default function NotificationBell({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = items.filter((n) => !n.read).length;

  const load = useCallback(async () => {
    const { data } = await createClient()
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data as Notification[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const openPanel = () => {
    setOpen((o) => !o);
    if (!open && unread > 0) {
      const ids = items.filter((n) => !n.read).map((n) => n.id);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      void createClient().from("notifications").update({ read: true }).in("id", ids);
    }
  };

  const btnColor =
    tone === "light"
      ? "text-ink-soft hover:text-ink"
      : "text-neutral-300 hover:text-white";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={openPanel}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full transition ${btnColor}`}
      >
        <Bell className="h-[19px] w-[19px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="dropdown-in absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-neutral-100 bg-white text-neutral-900 shadow-xl">
          <div className="border-b border-neutral-100 px-4 py-3">
            <p className="text-sm font-bold">Notifications</p>
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-500">
              Nothing yet. Follow trucks to hear when they go live.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {items.map((n) => {
                const body = (
                  <div className="flex gap-3 px-4 py-3 transition hover:bg-neutral-50">
                    <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand">
                      <Zap className="h-4 w-4" fill="currentColor" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-neutral-800">{n.message}</p>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {new Date(n.created_at).toLocaleString("en", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => setOpen(false)} className="block">
                    {body}
                  </Link>
                ) : (
                  <div key={n.id}>{body}</div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
