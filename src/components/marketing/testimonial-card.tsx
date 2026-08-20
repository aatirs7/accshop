import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export interface TestimonialData {
  id: string;
  authorName: string;
  authorHandle: string | null;
  content: string;
  rating: number;
  createdAt: Date;
  imageUrl: string | null;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div
      className="text-brand-gold"
      aria-label={`${rating} out of 5 stars`}
    >
      {"★".repeat(Math.max(0, Math.min(5, rating)))}
      <span className="text-muted-foreground/40">
        {"★".repeat(5 - Math.max(0, Math.min(5, rating)))}
      </span>
    </div>
  );
}

export function TestimonialCard({ t }: { t: TestimonialData }) {
  return (
    <Card className="h-full overflow-hidden border-border/60 bg-card/60">
      {t.imageUrl && (
        <div className="aspect-video w-full overflow-hidden bg-brand-raised">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={t.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <CardContent className="flex h-full flex-col gap-4 p-6">
        <Stars rating={t.rating} />
        <p className="flex-1 text-sm leading-relaxed text-foreground/90">
          &ldquo;{t.content}&rdquo;
        </p>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{t.authorName}</p>
            {t.authorHandle && (
              <p className="text-xs text-muted-foreground">{t.authorHandle}</p>
            )}
          </div>
          <p className="shrink-0 text-xs text-muted-foreground">
            {formatDate(t.createdAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
