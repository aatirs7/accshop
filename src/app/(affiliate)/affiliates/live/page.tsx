import { MessageCircle, Radio, UserCheck } from "lucide-react";
import { requireAffiliate } from "@/lib/affiliates/auth";
import { getAffiliateLiveSessions } from "@/lib/affiliates/stats";
import { weekBounds } from "@/lib/affiliates/live";
import { shiftDay } from "@/lib/daily-ops";
import { Card, CardContent } from "@/components/ui/card";
import { WeeklyGoals } from "@/components/affiliates/dashboard/weekly-goals";
import { LiveSessionForm } from "@/components/affiliates/live/live-session-form";
import { LiveSessionList } from "@/components/affiliates/live/live-session-list";
import { LocalDaySync } from "@/components/affiliates/live/local-day-sync";
import { getViewerToday } from "@/components/affiliates/live/viewer-today";

export const metadata = { title: "LIVE reports" };
// Depends on the signed-in affiliate and the viewer's local day.
export const dynamic = "force-dynamic";

export default async function AffiliateLivePage() {
  const { affiliate } = await requireAffiliate();
  const today = await getViewerToday();
  const sessions = await getAffiliateLiveSessions(affiliate.id, 200);

  const bounds = weekBounds(today);
  const thisWeek = sessions.filter((s) => s.sessionDate >= bounds.start && s.sessionDate <= bounds.end);
  const week = {
    ...bounds,
    liveMinutes: thisWeek.reduce((sum, s) => sum + s.durationMinutes, 0),
    liveSessions: thisWeek.length,
    hoursGoal: affiliate.weeklyLiveHoursGoal,
    sessionsGoal: affiliate.weeklyLiveSessionsGoal,
  };
  const weekDms = thisWeek.reduce((sum, s) => sum + s.incomingDms, 0);
  const weekLeads = thisWeek.reduce((sum, s) => sum + s.qualifiedLeads, 0);
  const maxDate = shiftDay(today, 1);

  const items = sessions.map((s) => ({
    id: s.id,
    sessionDate: s.sessionDate,
    startTime: s.startTime,
    endTime: s.endTime,
    durationMinutes: s.durationMinutes,
    incomingDms: s.incomingDms,
    qualifiedLeads: s.qualifiedLeads,
    commonQuestions: s.commonQuestions,
    technicalIssues: s.technicalIssues,
    notes: s.notes,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <LocalDaySync serverToday={today} />

      <header className="text-center">
        <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          <Radio className="size-3.5 text-brand-gold" aria-hidden="true" />
          LIVE reports
        </p>
        <h1 className="mt-2 font-display text-3xl font-medium sm:text-4xl">Log your LIVEs</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Report every stream so your hours count toward this week&apos;s goals.
        </p>
      </header>

      <div className="space-y-3">
        <WeeklyGoals week={week} title="This week" />
        <div className="grid grid-cols-2 gap-3">
          <Card size="sm">
            <CardContent className="flex items-center gap-3">
              <MessageCircle className="size-5 text-brand-gold" aria-hidden="true" />
              <div>
                <p className="font-display text-2xl tabular-nums">{weekDms}</p>
                <p className="text-xs text-muted-foreground">DMs this week</p>
              </div>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="flex items-center gap-3">
              <UserCheck className="size-5 text-brand-gold" aria-hidden="true" />
              <div>
                <p className="font-display text-2xl tabular-nums">{weekLeads}</p>
                <p className="text-xs text-muted-foreground">Qualified leads this week</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-brand-gold/5 via-card to-card">
        <CardContent className="space-y-5">
          <div>
            <h2 className="font-display text-xl font-medium">Report a LIVE</h2>
            <p className="text-sm text-muted-foreground">Use the times on your own clock.</p>
          </div>
          {/* Keyed by day so the default date follows the viewer's local today. */}
          <LiveSessionForm key={today} defaultDate={today} maxDate={maxDate} />
        </CardContent>
      </Card>

      <section aria-labelledby="live-history" className="space-y-4">
        <div className="flex items-end justify-between gap-2">
          <h2 id="live-history" className="font-display text-xl font-medium">
            Your LIVEs
          </h2>
          {items.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {items.length} {items.length === 1 ? "report" : "reports"}
            </p>
          )}
        </div>
        <LiveSessionList sessions={items} maxDate={maxDate} />
      </section>
    </div>
  );
}
