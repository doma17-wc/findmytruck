import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  const { code } = params;

  const { data: redirect, error } = await supabase
    .from("qr_redirects")
    .select("short_code, destination_url, scan_count")
    .eq("short_code", code)
    .maybeSingle();

  if (error || !redirect) {
    return NextResponse.redirect(new URL("/", req.url), 302);
  }

  // Fire-and-forget increment; don't block the redirect on it.
  supabase
    .from("qr_redirects")
    .update({ scan_count: redirect.scan_count + 1 })
    .eq("short_code", code)
    .then(() => {});

  return NextResponse.redirect(redirect.destination_url, 302);
}
