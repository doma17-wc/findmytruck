import { supabase } from "./supabase";
import type { Review } from "./types";

export interface ReviewSummary {
  avg: number;
  count: number;
}

export function summarize(reviews: Pick<Review, "rating">[]): ReviewSummary {
  if (reviews.length === 0) return { avg: 0, count: 0 };
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  return { avg: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}

/** Average rating + count for every truck that has at least one review,
 *  keyed by truck id. Used by the map list, browse grid and city pages. */
export async function getAllTruckRatings(): Promise<Record<string, ReviewSummary>> {
  const { data, error } = await supabase.from("reviews").select("truck_id, rating");
  if (error || !data) return {};

  const acc: Record<string, { sum: number; count: number }> = {};
  for (const row of data as { truck_id: string; rating: number }[]) {
    const a = (acc[row.truck_id] ??= { sum: 0, count: 0 });
    a.sum += row.rating;
    a.count += 1;
  }

  const out: Record<string, ReviewSummary> = {};
  for (const [id, { sum, count }] of Object.entries(acc)) {
    out[id] = { avg: Math.round((sum / count) * 10) / 10, count };
  }
  return out;
}

/** Newest-first reviews for one truck (public read). */
export async function getReviewsForTruck(truckId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("truck_id", truckId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as Review[];
}
