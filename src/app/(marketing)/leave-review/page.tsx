import { ReviewForm } from "@/components/marketing/review-form";

export const metadata = { title: "Leave a review" };

export default async function LeaveReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  return (
    <main className="bg-atmosphere">
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
            Share your experience
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium sm:text-5xl">
            Leave a review
          </h1>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground text-balance">
            Happy with your account? Tell future buyers about it. Approved
            reviews appear on our homepage and testimonials page.
          </p>
        </div>
        <div className="mt-12 rounded-2xl border border-border/60 bg-card/60 p-8">
          <ReviewForm orderCode={order} />
        </div>
      </div>
    </main>
  );
}
