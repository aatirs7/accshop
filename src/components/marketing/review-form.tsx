"use client";

import { useActionState, useState } from "react";
import {
  submitTestimonialReview,
  type ReviewResult,
} from "@/actions/testimonials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ReviewForm({ orderCode }: { orderCode?: string }) {
  const [rating, setRating] = useState(5);
  const [state, action, pending] = useActionState<ReviewResult | null, FormData>(
    submitTestimonialReview,
    null,
  );

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-brand-gold/40 bg-brand-gold/5 p-6 text-center">
        <p className="font-display text-lg text-brand-gold">Thank you! 🙏</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Your review was submitted for approval. We really appreciate it.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {orderCode && <input type="hidden" name="orderCode" value={orderCode} />}
      <input type="hidden" name="rating" value={rating} />

      <div>
        <Label className="text-sm">Rating</Label>
        <div className="mt-1 flex gap-1 text-2xl">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={n <= rating ? "text-brand-gold" : "text-muted-foreground/40"}
              aria-label={`${n} stars`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="authorName">Your name</Label>
          <Input id="authorName" name="authorName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="authorHandle">Handle (optional)</Label>
          <Input id="authorHandle" name="authorHandle" placeholder="@you" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="headline">Headline (optional)</Label>
        <Input id="headline" name="headline" placeholder="Delivered fast, zero hassle" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">Your review</Label>
        <Textarea id="content" name="content" rows={4} required minLength={10} />
      </div>
      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}
