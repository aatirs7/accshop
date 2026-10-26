import { requireAdminPage } from "@/lib/auth-helpers";
import { isDayKey } from "@/lib/daily-ops";
import {
  getDayTasks,
  getOutstandingFulfillments,
  getCompletedFulfillments,
  getNote,
} from "@/actions/admin/daily-operations";
import { DateNav } from "@/components/admin/daily-ops/date-nav";
import { DailyTasks } from "@/components/admin/daily-ops/daily-tasks";
import { FulfillmentTracker } from "@/components/admin/daily-ops/fulfillment-tracker";
import { NotesSection } from "@/components/admin/daily-ops/notes-section";

export const metadata = { title: "Daily Operations" };
// The page is a function of the selected day; never cache it.
export const dynamic = "force-dynamic";

export default async function DailyOperationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const raw = Array.isArray(params.date) ? params.date[0] : params.date;
  const date = isDayKey(raw) ? raw : null;

  // Without a valid ?date we don't know the viewer's local "today" on the
  // server, so render just the nav — it redirects to local today on mount.
  if (!date) {
    return (
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <h1 className="font-display text-3xl font-medium">Daily Operations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your daily tasks, fulfillments to chase, and notes.
          </p>
        </header>
        <DateNav date={null} />
        <p className="mt-10 text-center text-sm text-muted-foreground">Loading today…</p>
      </div>
    );
  }

  const [tasks, outstanding, completed, generalNote, dayNote] = await Promise.all([
    getDayTasks(date),
    getOutstandingFulfillments(date),
    getCompletedFulfillments(date),
    getNote("general"),
    getNote(`day:${date}`),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-medium">Daily Operations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your daily tasks, fulfillments to chase, and notes.
        </p>
      </header>

      <DateNav date={date} />

      <div className="mt-6 grid gap-6">
        <DailyTasks date={date} tasks={tasks} />
        <FulfillmentTracker date={date} outstanding={outstanding} completed={completed} />
        <NotesSection date={date} generalNote={generalNote} dayNote={dayNote} />
      </div>
    </div>
  );
}
