import Link from "next/link";
import { BellOff, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const metadata = { title: "Unsubscribe" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { t?: string };
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const token = (searchParams.t ?? "").trim();
  let ok = false;

  if (token) {
    const { data, error } = await supabase.rpc("unsubscribe_follow_notifications", {
      p_token: token,
    });
    ok = !error && data === true;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand">
        {ok ? <CheckCircle2 className="h-7 w-7" /> : <BellOff className="h-7 w-7" />}
      </div>
      <h1 className="mt-4 text-xl font-extrabold text-neutral-900">
        {ok ? "You're unsubscribed" : "Link expired or invalid"}
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        {ok
          ? "You'll no longer get e-mails when trucks you follow go live. You can turn them back on any time from your account settings."
          : "We couldn't process this unsubscribe link. Sign in and manage notifications from your account instead."}
      </p>
      <Link
        href="/account"
        className="mt-6 inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white"
      >
        Go to my account
      </Link>
    </div>
  );
}
