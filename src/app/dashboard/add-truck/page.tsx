import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/supabase/server";
import AddTruckForm from "@/components/dashboard/AddTruckForm";

export const metadata = { title: "Add another truck" };
export const dynamic = "force-dynamic";

export default async function AddTruckPage() {
  const auth = await getCurrentUserProfile();
  if (!auth) redirect("/login?next=/dashboard/add-truck");
  if (auth.profile?.role !== "truck_owner" && auth.ownedTruckIds.length === 0) {
    redirect("/register-truck");
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div className="mt-4 rounded-2xl border border-line bg-card p-6 shadow-card sm:p-8">
        <h1 className="font-display text-2xl font-extrabold text-ink">Add another truck</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Manage a second truck from this same account — no new login needed. If a listing with this
          exact name already exists on FindMyTruck, you&apos;ll claim it; otherwise we create a fresh
          one.
        </p>
        <div className="mt-6">
          <AddTruckForm />
        </div>
      </div>
    </div>
  );
}
