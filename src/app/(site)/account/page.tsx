import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, Heart, LogOut } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/supabase/server";
import { signOutAction } from "../auth-actions";

export const metadata = { title: "Your profile" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const auth = await getCurrentUserProfile();
  if (!auth) redirect("/login?next=/account");

  const { user, profile } = auth;
  const isOwner = profile?.role === "truck_owner";

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-xl font-bold text-white">
            {(profile?.display_name || user.email || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-neutral-900">
              {profile?.display_name || "FindMyTruck user"}
            </p>
            <p className="truncate text-sm text-neutral-500">{user.email}</p>
          </div>
        </div>

        <span className="mt-4 inline-block rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand">
          {isOwner ? "Truck owner" : "Customer"}
        </span>

        <div className="mt-6 space-y-2">
          {isOwner ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-xl border border-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              <LayoutDashboard className="h-[18px] w-[18px] text-brand" />
              Go to truck dashboard
            </Link>
          ) : (
            <Link
              href="/favorites"
              className="flex items-center gap-3 rounded-xl border border-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              <Heart className="h-[18px] w-[18px] text-brand" />
              My favorites
            </Link>
          )}

          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl border border-neutral-100 px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
