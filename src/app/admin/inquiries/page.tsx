import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { bulkInquiries } from "@/lib/db/schema";
import { formatDate } from "@/lib/format";
import { InquiryStatusSelect } from "@/components/admin/queue-actions";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminInquiriesPage() {
  const inquiries = await db.query.bulkInquiries.findMany({
    orderBy: desc(bulkInquiries.createdAt),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium">Bulk inquiries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One-off wholesale requests from the /bulk form.
        </p>
      </div>
      {inquiries.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No inquiries yet.
          </CardContent>
        </Card>
      )}
      <div className="space-y-4">
        {inquiries.map((q) => (
          <Card key={q.id}>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {q.name}
                    {q.company && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        {q.company}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {q.email} · wants {q.quantityInterest ?? "?"} ·{" "}
                    {formatDate(q.createdAt)}
                  </p>
                  {q.message && (
                    <p className="mt-3 max-w-2xl text-sm">{q.message}</p>
                  )}
                </div>
                <InquiryStatusSelect inquiryId={q.id} current={q.status} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
