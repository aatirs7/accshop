import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { testimonials } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { TestimonialCard } from "@/components/marketing/testimonial-card";

export const metadata = { title: "Testimonials" };

export default async function TestimonialsPage() {
  const all = await db.query.testimonials.findMany({
    where: eq(testimonials.published, true),
    orderBy: asc(testimonials.sort),
  });

  return (
    <main className="bg-atmosphere">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
            Testimonials
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium sm:text-5xl">
            What buyers and mentors say
          </h1>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {all.map((t) => (
            <TestimonialCard key={t.id} t={t} />
          ))}
        </div>
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">Ready to join them?</p>
          <Button asChild size="lg" className="mt-4">
            <Link href="/accounts">Browse accounts</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
