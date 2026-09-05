"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getBooleanSetting } from "@/lib/settings";

export interface ReviewResult {
  error?: string;
  success?: boolean;
}

export interface ReviewInput {
  truckId: string;
  rating: number;
  text?: string;
  photoUrl?: string | null;
  /** Only used for logged-out reviewers. */
  name?: string;
  /** Honeypot — real users never fill this. */
  website?: string;
}

/** Very light in-memory rate limit: max 5 review submissions per IP / 10 min.
 *  Resets on deploy — that's fine, it only blunts bursts. */
const HITS = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (HITS.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  HITS.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function submitReviewAction(input: ReviewInput): Promise<ReviewResult> {
  // Honeypot: pretend it worked, write nothing.
  if (input.website && input.website.trim() !== "") return { success: true };

  const rating = Math.round(Number(input.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { error: "Please pick a rating from 1 to 5 stars." };
  }
  if (!input.truckId) return { error: "Missing truck." };

  const ip =
    headers().get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers().get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return { error: "You're doing that a lot — please try again in a few minutes." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const requireLogin = await getBooleanSetting("reviews_require_login", false);
  if (requireLogin && !user) {
    return { error: "Please log in to leave a review." };
  }

  // Author name: signed-in users always review under their profile name.
  let authorName = "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    authorName = (profile?.display_name || user.email?.split("@")[0] || "FindMyTruck user").trim();
  } else {
    authorName = (input.name ?? "").trim();
    if (authorName.length < 2) return { error: "Please enter your name." };
    if (authorName.length > 60) authorName = authorName.slice(0, 60);
  }

  const text = (input.text ?? "").trim().slice(0, 2000) || null;
  const photoUrl = (input.photoUrl ?? "").trim() || null;

  // One review per person per truck per day. Signed-in => by user_id; anon =>
  // by (case-insensitive) name. Checked against the last 24h.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let dupeQuery = supabase
    .from("reviews")
    .select("id")
    .eq("truck_id", input.truckId)
    .gte("created_at", since)
    .limit(1);
  dupeQuery = user
    ? dupeQuery.eq("user_id", user.id)
    : dupeQuery.ilike("author_name", authorName);
  const { data: existing } = await dupeQuery;
  if (existing && existing.length > 0) {
    return { error: "You've already reviewed this truck today. Thanks!" };
  }

  const { error } = await supabase.from("reviews").insert({
    truck_id: input.truckId,
    user_id: user?.id ?? null,
    author_name: authorName,
    rating,
    text,
    photo_url: photoUrl,
  });
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/zurich");
  revalidatePath("/trucks/[slug]", "page");
  return { success: true };
}
