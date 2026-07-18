import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { testimonials } from "@/lib/db/schema";
import {
  deleteTestimonial,
  setTestimonialFlags,
} from "@/actions/admin/catalog";
import { ActionButton } from "@/components/admin/action-button";
import { TestimonialForm } from "@/components/admin/queue-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminTestimonialsPage() {
  const rows = await db.query.testimonials.findMany({
    orderBy: asc(testimonials.sort),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium">Testimonials</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Only publish real customer quotes, replace all sample entries
            before launch.
          </p>
        </div>
        <TestimonialForm />
      </div>
      <div className="space-y-4">
        {rows.map((t) => (
          <Card key={t.id}>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{t.authorName}</p>
                    {t.authorHandle && (
                      <span className="text-sm text-muted-foreground">
                        {t.authorHandle}
                      </span>
                    )}
                    <span className="text-brand-gold">
                      {"★".repeat(t.rating)}
                    </span>
                    {t.published ? (
                      <Badge
                        variant="outline"
                        className="border-brand-success/50 text-brand-success"
                      >
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="outline">Hidden</Badge>
                    )}
                    {t.featured && (
                      <Badge
                        variant="outline"
                        className="border-brand-gold/40 text-brand-gold"
                      >
                        Featured
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t.content}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    action={setTestimonialFlags.bind(null, t.id, {
                      published: !t.published,
                    })}
                    successText={t.published ? "Hidden" : "Published"}
                  >
                    {t.published ? "Hide" : "Publish"}
                  </ActionButton>
                  <ActionButton
                    action={setTestimonialFlags.bind(null, t.id, {
                      featured: !t.featured,
                    })}
                    successText="Updated"
                  >
                    {t.featured ? "Unfeature" : "Feature"}
                  </ActionButton>
                  <ActionButton
                    action={deleteTestimonial.bind(null, t.id)}
                    variant="destructive"
                    confirmText="Delete this testimonial permanently?"
                    successText="Deleted"
                  >
                    Delete
                  </ActionButton>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
