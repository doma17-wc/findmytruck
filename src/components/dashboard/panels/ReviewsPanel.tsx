"use client";

import { useState, useTransition } from "react";
import { Star, Loader2, MessageSquareReply } from "lucide-react";
import type { Review } from "@/lib/types";
import { replyToReviewAction } from "@/app/dashboard/actions";
import { Card, CardBody, useToast, cn, dashInput } from "../ui";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "h-3.5 w-3.5",
            n <= rating ? "fill-amber text-amber" : "text-line"
          )}
        />
      ))}
    </span>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [reply, setReply] = useState(review.reply ?? "");

  const save = () => {
    startTransition(async () => {
      const res = await replyToReviewAction(review.id, reply);
      if (res.error) toast(res.error, "error");
      else {
        toast("Reply posted");
        setEditing(false);
      }
    });
  };

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-paper-deep font-display text-sm font-bold text-ink">
            {review.author_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{review.author_name}</p>
            <div className="flex items-center gap-2">
              <Stars rating={review.rating} />
              <span className="text-xs text-muted">
                {new Date(review.created_at).toLocaleDateString("en", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        {review.text && <p className="text-sm leading-relaxed text-ink-soft">{review.text}</p>}

        {review.reply && !editing && (
          <div className="rounded-xl bg-paper-deep p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Your reply</p>
            <p className="mt-1 text-sm text-ink-soft">{review.reply}</p>
          </div>
        )}

        {editing ? (
          <div className="space-y-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              placeholder="Write a public reply…"
              className={dashInput}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-bold text-white transition hover:bg-accent-dark disabled:opacity-60"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Post reply
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setReply(review.reply ?? "");
                }}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-dark hover:underline"
          >
            <MessageSquareReply className="h-4 w-4" />
            {review.reply ? "Edit reply" : "Reply"}
          </button>
        )}
      </CardBody>
    </Card>
  );
}

export default function ReviewsPanel({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <Star className="mx-auto h-8 w-8 text-line" />
          <p className="mt-3 font-display text-base font-bold text-ink">No reviews yet</p>
          <p className="mt-1 text-sm text-muted">
            Reviews from customers will show up here once people start rating your truck.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <ReviewCard key={r.id} review={r} />
      ))}
    </div>
  );
}
