import { BulkInquiryForm } from "@/components/marketing/inquiry-forms";

export const metadata = { title: "Bulk orders" };

export default function BulkPage() {
  return (
    <main className="bg-atmosphere">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
            Wholesale
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium sm:text-5xl">
            Bulk orders, handled like clockwork
          </h1>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted-foreground text-balance">
            Supplying a mentorship program or scaling an agency? We fulfill
            10–20+ accounts per week for programs like yours, with volume
            pricing that improves at 10, 20, and 50 accounts. Tell us what you
            need and we&apos;ll reply within 24 hours.
          </p>
        </div>
        <div className="mt-12 rounded-2xl border border-border/60 bg-card/60 p-8">
          <BulkInquiryForm />
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Want recurring weekly supply plus referral commissions? Check the{" "}
          <a href="/partners" className="text-brand-gold underline">
            partner program
          </a>
          .
        </p>
      </div>
    </main>
  );
}
