import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { testimonialSubmissions, testimonials } from "@/lib/db/schema";
import {
  deleteTestimonial,
  setTestimonialFlags,
} from "@/actions/admin/catalog";
import { ActionButton } from "@/components/admin/action-button";
import {
  SubmissionActions,
  TestimonialForm,
} from "@/components/admin/queue-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export default async function AdminTestimonialsPage() {
  const [rows, submissions] = await Promise.all([
    db.query.testimonials.findMany({ orderBy: asc(testimonials.sort) }),
    db.query.testimonialSubmissions.findMany({
      where: eq(testimonialSubmissions.status, "new"),
      orderBy: desc(testimonialSubmissions.createdAt),
    }),
  ]);

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

      {submissions.length > 0 && (
        <Card className="border-brand-gold/30">
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold text-brand-gold">
              Pending submissions ({submissions.length})
            </h2>
            <div className="mt-4 space-y-4">
              {submissions.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border/60 p-4"
                >
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.authorName}</span>
                      <span className="text-brand-gold">
                        {"★".repeat(s.rating)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(s.createdAt)}
                        {s.orderCode ? ` · ${s.orderCode}` : ""}
                      </span>
                    </div>
                    {s.headline && (
                      <p className="mt-1 font-display text-sm font-semibold">
                        {s.headline}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-muted-foreground">
                      {s.content}
                    </p>
                  </div>
                  <SubmissionActions submissionId={s.id} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
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
