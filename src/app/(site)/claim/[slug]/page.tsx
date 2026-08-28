import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock, CheckCircle2 } from "lucide-react";
import { getTruckBySlug } from "@/lib/data";
import { getCurrentUserProfile } from "@/lib/supabase/server";
import ClaimForm from "@/components/site/ClaimForm";

export const metadata = { title: "Claim your truck profile" };
export const dynamic = "force-dynamic";

export default async function ClaimProfilePage({ params }: { params: { slug: string } }) {
  const truck = await getTruckBySlug(params.slug);
  if (!truck) notFound();

  const auth = await getCurrentUserProfile();
  const status = truck.claim_status ?? "unclaimed";
  const alreadyLinkedToOther =
    Boolean(auth?.profile?.truck_id) && auth?.profile?.truck_id !== truck.id;

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-100 bg-white p-6 shadow-card sm:p-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand">
          <BadgeCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-neutral-900">Claim {truck.name}</h1>

        {status === "claimed" ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-green-50 px-3 py-3 text-sm text-green-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              This profile has already been claimed and verified.{" "}
              <Link href={`/trucks/${truck.slug}`} className="font-semibold underline">
                View it
              </Link>
              .
            </span>
          </div>
        ) : status === "pending" ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-700">
            <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              A claim for this profile has already been submitted and is awaiting verification. If
              that was you, sign in to reach your dashboard.
            </span>
          </div>
        ) : alreadyLinkedToOther ? (
          <div className="mt-4 rounded-xl bg-neutral-50 px-3 py-3 text-sm text-neutral-600">
            Your account is already linked to a different truck, so it can&apos;t claim this one.
            Contact us if that&apos;s not right.
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-neutral-500">
              Take ownership of this listing to manage its schedule, menu, and photos.
            </p>
            <div className="mt-6">
              <ClaimForm slug={truck.slug} truckName={truck.name} signedIn={Boolean(auth)} />
            </div>
          </>
        )}

        <p className="mt-6 text-center text-xs text-neutral-400">
          <Link href={`/trucks/${truck.slug}`} className="hover:text-neutral-600">
            ← Back to the profile
          </Link>
        </p>
      </div>
    </div>
  );
}
