"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Clock, MessageCircle, Pencil, Radio, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { deleteLiveSession } from "@/actions/affiliates/live";
import { formatDuration } from "@/lib/affiliates/live";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { clockTime, longDay } from "@/components/affiliates/dashboard/format-day";
import { LiveSessionForm } from "./live-session-form";

export interface LiveSessionItem {
  id: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  incomingDms: number;
  qualifiedLeads: number;
  commonQuestions: string | null;
  technicalIssues: string | null;
  notes: string | null;
}

function NoteBlock({ title, body }: { title: string; body: string | null }) {
  if (!body) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm whitespace-pre-wrap break-words">{body}</p>
    </div>
  );
}

function SessionRow({ s, maxDate }: { s: LiveSessionItem; maxDate: string }) {
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const hasNotes = Boolean(s.commonQuestions || s.technicalIssues || s.notes);
  const crosses = s.endTime < s.startTime;

  function remove() {
    startTransition(async () => {
      const result = await deleteLiveSession(s.id);
      setConfirming(false);
      if (result.ok) toast.success("Report deleted");
      else toast.error(result.error);
    });
  }

  return (
    <li className="rounded-xl border border-border/60 bg-card px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{longDay(s.sessionDate)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {clockTime(s.startTime)} to {clockTime(s.endTime)}
            {crosses && " (next day)"}
          </p>
        </div>
        <p className="flex shrink-0 items-center gap-1 font-display text-lg text-brand-gold tabular-nums">
          <Clock className="size-4" aria-hidden="true" />
          {formatDuration(s.durationMinutes)}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <MessageCircle className="size-3.5" aria-hidden="true" />
          <span className="text-foreground tabular-nums">{s.incomingDms}</span> DMs
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <UserCheck className="size-3.5" aria-hidden="true" />
          <span className="text-foreground tabular-nums">{s.qualifiedLeads}</span>{" "}
          {s.qualifiedLeads === 1 ? "lead" : "leads"}
        </span>
      </div>

      {hasNotes && (
        <details className="group mt-3 rounded-lg bg-muted/30 px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronDown
              className="size-3.5 transition-transform group-open:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            />
            Notes
          </summary>
          <div className="mt-2 space-y-3">
            <NoteBlock title="Common questions" body={s.commonQuestions} />
            <NoteBlock title="Technical issues" body={s.technicalIssues} />
            <NoteBlock title="Additional notes" body={s.notes} />
          </div>
        </details>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {confirming ? (
          <div
            role="group"
            aria-label="Confirm delete"
            className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 animate-in fade-in duration-200"
          >
            <span className="text-xs">Delete this report?</span>
            <Button size="sm" variant="destructive" disabled={pending} onClick={remove}>
              {pending ? "Deleting..." : "Delete"}
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
              Keep it
            </Button>
          </div>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil aria-hidden="true" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setConfirming(true)}
            >
              <Trash2 aria-hidden="true" />
              Delete
            </Button>
          </>
        )}
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit LIVE report</DialogTitle>
            <DialogDescription>{longDay(s.sessionDate)}</DialogDescription>
          </DialogHeader>
          <LiveSessionForm
            defaultDate={s.sessionDate}
            maxDate={maxDate}
            sessionId={s.id}
            initial={{
              sessionDate: s.sessionDate,
              startTime: s.startTime,
              endTime: s.endTime,
              incomingDms: String(s.incomingDms),
              qualifiedLeads: String(s.qualifiedLeads),
              commonQuestions: s.commonQuestions ?? "",
              technicalIssues: s.technicalIssues ?? "",
              notes: s.notes ?? "",
            }}
            onDone={() => setEditing(false)}
          />
        </DialogContent>
      </Dialog>
    </li>
  );
}

/** The affiliate's own LIVE reports, newest first, with edit and delete. */
export function LiveSessionList({ sessions, maxDate }: { sessions: LiveSessionItem[]; maxDate: string }) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-brand-gold/30 px-4 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold">
          <Radio className="size-6" aria-hidden="true" />
        </span>
        <p className="font-display text-lg">No LIVEs reported yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          After each stream, log it above. Your hours and sessions count toward your weekly goals.
        </p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {sessions.map((s) => (
        <SessionRow key={s.id} s={s} maxDate={maxDate} />
      ))}
    </ul>
  );
}
