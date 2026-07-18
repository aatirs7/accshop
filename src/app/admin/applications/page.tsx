import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { partnerApplications } from "@/lib/db/schema";
import { formatDate } from "@/lib/format";
import { ApplicationActions } from "@/components/admin/queue-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const statusTone: Record<string, string> = {
  new: "border-brand-warning/50 text-brand-warning",
  in_review: "border-brand-gold/40 text-brand-gold",
  approved: "border-brand-success/50 text-brand-success",
  rejected: "border-destructive/50 text-destructive",
};

export default async function AdminApplicationsPage() {
  const applications = await db.query.partnerApplications.findMany({
    orderBy: desc(partnerApplications.createdAt),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium">
          Partner applications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approving creates the partner and emails them; set pricing rules on
          their profile afterwards.
        </p>
      </div>
      {applications.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No applications yet.
          </CardContent>
        </Card>
      )}
      <div className="space-y-4">
        {applications.map((a) => (
          <Card key={a.id}>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-medium">{a.name}</p>
                    <Badge variant="outline" className={statusTone[a.status]}>
                      {a.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {a.email} · TikTok {a.tiktokHandle}
                    {a.otherSocials && ` · ${a.otherSocials}`}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Est. weekly volume: {a.estWeeklyVolume ?? "n/a"} · applied{" "}
                    {formatDate(a.createdAt)}
                  </p>
                  {a.message && (
                    <p className="mt-3 max-w-2xl text-sm">{a.message}</p>
                  )}
                </div>
                {(a.status === "new" || a.status === "in_review") && (
                  <ApplicationActions applicationId={a.id} />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
