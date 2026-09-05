"use client";

import { useEffect, useState } from "react";
import { MessageSquareReply, PenLine, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Review } from "@/lib/types";
import { summarize } from "@/lib/reviews";
import { StarRow } from "./Stars";
import ReviewForm from "./ReviewForm";

interface ReviewsSectionProps {
  truckId: string;
  truckName: string;
  signedIn: boolean;
  requireLogin: boolean;
  /** Pass server-fetched reviews for SEO; omit to lazy-load on mount. */
  initialReviews?: Review[] | null;
  /** Tighter spacing / smaller heading for the slide-over detail sheet. */
  compact?: boolean;
}

function ReviewItem({ review, compact }: { review: Review; compact?: boolean }) {
  const initial = review.author_name.charAt(0).toUpperCase() || "?";
  const date = new Date(review.created_at).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="border-b border-line py-4 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-paper-deep font-display text-sm font-bold text-ink">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{review.author_name}</p>
          <div className="flex items-center gap-2">
            <StarRow rating={review.rating} size={13} />
            <span className="text-xs text-muted">{date}</span>
          </div>
        </div>
      </div>

      {review.text && (
        <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{review.text}</p>
      )}

      {review.photo_url && (
        <a
          href={review.photo_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block w-fit overflow-hidden rounded-xl border border-line"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={review.photo_url}
            alt={`Dish photographed by ${review.author_name}`}
            className={compact ? "h-32 w-32 object-cover" : "h-44 w-44 object-cover"}
          />
        </a>
      )}

      {review.reply && (
        <div className="mt-3 rounded-xl bg-paper-deep p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
            <MessageSquareReply className="h-3.5 w-3.5" />
            Owner&rsquo;s reply
          </p>
          <p className="mt-1 text-sm text-ink-soft">{review.reply}</p>
        </div>
      )}
    </div>
  );
}

export default function ReviewsSection({
  truckId,
  truckName,
  signedIn,
  requireLogin,
  initialReviews,
  compact,
}: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews ?? []);
  const [loading, setLoading] = useState(initialReviews == null);
  const [writing, setWriting] = useState(false);

  const load = () => {
    let cancelled = false;
    void (async () => {
      const { data } = await createClient()
        .from("reviews")
        .select("*")
        .eq("truck_id", truckId)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setReviews((data as Review[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    if (initialReviews == null) return load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [truckId]);

  const summary = summarize(reviews);
  const HeadingTag = compact ? "h3" : "h2";

  return (
    <section className={compact ? "mt-5" : "mt-9"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <HeadingTag
          className={
            compact
              ? "font-display text-sm font-bold uppercase tracking-wider text-muted"
              : "text-lg font-bold text-ink"
          }
        >
          {compact ? "Reviews" : "Reviews"}
        </HeadingTag>
        {!writing && (
          <button
            type="button"
            onClick={() => setWriting(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-1.5 text-[13px] font-bold text-brand-700 transition hover:bg-brand-100"
          >
            <PenLine className="h-3.5 w-3.5" />
            Write a review
          </button>
        )}
      </div>

      {summary.count > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <StarRow rating={summary.avg} size={16} />
          <span className="font-mono text-sm font-bold text-ink">{summary.avg.toFixed(1)}</span>
          <span className="text-sm text-muted">
            ({summary.count} review{summary.count === 1 ? "" : "s"})
          </span>
        </div>
      )}

      {writing && (
        <div className="mt-4">
          <ReviewForm
            truckId={truckId}
            truckName={truckName}
            signedIn={signedIn}
            requireLogin={requireLogin}
            onDone={() => {
              setWriting(false);
              load();
            }}
          />
        </div>
      )}

      <div className="mt-2">
        {loading ? (
          <p className="py-6 text-sm text-muted">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted">
            <Star className="h-4 w-4 text-line" />
            No reviews yet — be the first.
          </p>
        ) : (
          reviews.map((r) => <ReviewItem key={r.id} review={r} compact={compact} />)
        )}
      </div>
    </section>
  );
}
