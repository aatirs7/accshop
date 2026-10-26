"use client";

import { useState, useTransition } from "react";
import { Moon, Timer } from "lucide-react";
import { toast } from "sonner";
import { createLiveSession, updateLiveSession, type LiveSessionInput } from "@/actions/affiliates/live";
import { formatDuration, liveDurationMinutes, TIME_RE } from "@/lib/affiliates/live";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface LiveFormValues {
  sessionDate: string;
  startTime: string;
  endTime: string;
  incomingDms: string;
  qualifiedLeads: string;
  commonQuestions: string;
  technicalIssues: string;
  notes: string;
}

function blank(date: string): LiveFormValues {
  return {
    sessionDate: date,
    startTime: "",
    endTime: "",
    incomingDms: "0",
    qualifiedLeads: "0",
    commonQuestions: "",
    technicalIssues: "",
    notes: "",
  };
}

/** Some browsers emit HH:MM:SS from type=time; the server wants HH:MM. */
const hhmm = (v: string) => v.slice(0, 5);

function DurationPreview({ start, end }: { start: string; end: string }) {
  if (!start || !end) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Timer className="size-4" aria-hidden="true" />
        Enter start and end times to see your LIVE length.
      </p>
    );
  }
  const s = hhmm(start);
  const e = hhmm(end);
  const minutes = TIME_RE.test(s) && TIME_RE.test(e) ? liveDurationMinutes(s, e) : null;
  if (minutes === null) {
    return <p className="text-sm text-destructive">The end time must be different from the start time.</p>;
  }
  const crosses = e < s;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <p className="flex items-center gap-2 text-sm">
        <Timer className="size-4 text-brand-gold" aria-hidden="true" />
        <span className="text-muted-foreground">Duration</span>
        <span className="font-display text-xl text-brand-gold tabular-nums">{formatDuration(minutes)}</span>
      </p>
      {crosses && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Moon className="size-3.5" aria-hidden="true" />
          Crosses midnight, counted as ending the next day.
        </p>
      )}
    </div>
  );
}

/**
 * Report (or edit) a LIVE. The duration preview is for the affiliate only;
 * the server recomputes it from the times.
 */
export function LiveSessionForm({
  defaultDate,
  maxDate,
  sessionId,
  initial,
  onDone,
}: {
  defaultDate: string;
  maxDate: string;
  sessionId?: string;
  initial?: LiveFormValues;
  onDone?: () => void;
}) {
  const editing = Boolean(sessionId);
  const [values, setValues] = useState<LiveFormValues>(initial ?? blank(defaultDate));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (key: keyof LiveFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const input: LiveSessionInput = {
      ...values,
      startTime: hhmm(values.startTime),
      endTime: hhmm(values.endTime),
    };
    startTransition(async () => {
      const result = sessionId ? await updateLiveSession(sessionId, input) : await createLiveSession(input);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Report updated" : "LIVE reported. Nice work!");
      if (!editing) setValues(blank(values.sessionDate));
      onDone?.();
    });
  }

  const idp = sessionId ? `edit-${sessionId}` : "new";

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idp}-date`}>Date</Label>
          <Input
            id={`${idp}-date`}
            type="date"
            required
            max={maxDate}
            value={values.sessionDate}
            onChange={set("sessionDate")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idp}-start`}>Start time</Label>
          <Input id={`${idp}-start`} type="time" required value={values.startTime} onChange={set("startTime")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idp}-end`}>End time</Label>
          <Input id={`${idp}-end`} type="time" required value={values.endTime} onChange={set("endTime")} />
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3" aria-live="polite">
        <DurationPreview start={values.startTime} end={values.endTime} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${idp}-dms`}>Incoming DMs</Label>
          <Input
            id={`${idp}-dms`}
            type="number"
            inputMode="numeric"
            min={0}
            max={100000}
            step={1}
            required
            value={values.incomingDms}
            onChange={set("incomingDms")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idp}-leads`}>Qualified leads</Label>
          <Input
            id={`${idp}-leads`}
            type="number"
            inputMode="numeric"
            min={0}
            max={100000}
            step={1}
            required
            value={values.qualifiedLeads}
            onChange={set("qualifiedLeads")}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idp}-questions`}>Common questions</Label>
        <Textarea
          id={`${idp}-questions`}
          maxLength={2000}
          rows={3}
          placeholder="What did viewers keep asking about?"
          value={values.commonQuestions}
          onChange={set("commonQuestions")}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idp}-issues`}>Technical issues</Label>
        <Textarea
          id={`${idp}-issues`}
          maxLength={2000}
          rows={2}
          placeholder="Lag, drops, audio problems, anything that got in the way"
          value={values.technicalIssues}
          onChange={set("technicalIssues")}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idp}-notes`}>Additional notes</Label>
        <Textarea
          id={`${idp}-notes`}
          maxLength={2000}
          rows={3}
          placeholder="Anything else worth knowing about this LIVE"
          value={values.notes}
          onChange={set("notes")}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className={cn("flex gap-2", editing ? "justify-end" : "justify-center")}>
        {editing && onDone && (
          <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={pending} className={editing ? undefined : "w-full sm:w-auto sm:min-w-48"}>
          {pending ? "Saving..." : editing ? "Save changes" : "Submit report"}
        </Button>
      </div>
    </form>
  );
}
