"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { saveNote, carryOverDayNote } from "@/actions/admin/daily-operations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { prettyDay } from "@/lib/daily-ops";

/**
 * General (always-on) + optional per-day notes. Both autosave: debounced while
 * typing, and force-flushed on blur, on unmount (e.g. changing the day), and
 * when the tab is hidden/closed, so the last keystrokes are never lost.
 */
export function NotesSection({
  date,
  generalNote,
  dayNote,
}: {
  date: string;
  generalNote: string;
  dayNote: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>General Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <AutosaveNote
          noteKey="general"
          initial={generalNote}
          label="General"
          hint="Always here, independent of the selected day."
          rows={8}
        />
        <AutosaveNote
          // Keyed by date so switching days remounts with that day's note
          // (and flushes the previous day's pending save on unmount).
          key={`day:${date}`}
          noteKey={`day:${date}`}
          initial={dayNote}
          label={`Note for ${prettyDay(date)}`}
          hint="Tied to this specific day."
          rows={5}
          carryFromDate={date}
        />
      </CardContent>
    </Card>
  );
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function AutosaveNote({
  noteKey,
  initial,
  label,
  hint,
  rows,
  carryFromDate,
}: {
  noteKey: string;
  initial: string;
  label: string;
  hint: string;
  rows: number;
  /** When set, shows a "Carry over to next day" button for this day's note. */
  carryFromDate?: string;
}) {
  const [carrying, startCarry] = useTransition();
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const valueRef = useRef(initial);
  const savedRef = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  valueRef.current = value;

  const persist = useCallback(
    async (content: string) => {
      if (content === savedRef.current) return;
      setStatus("saving");
      try {
        const r = await saveNote(noteKey, content);
        if (r.ok) {
          savedRef.current = content;
          setStatus("saved");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    },
    [noteKey],
  );

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (valueRef.current !== savedRef.current) void persist(valueRef.current);
  }, [persist]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
      flush(); // flush on unmount (e.g. day change)
    };
  }, [flush]);

  const dirty = value !== savedRef.current;
  const statusText =
    status === "saving"
      ? "Saving…"
      : status === "error"
        ? "Save failed — keep typing, it will retry"
        : dirty
          ? "Unsaved changes"
          : status === "saved"
            ? "Saved"
            : "";

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label className="text-sm font-medium">{label}</label>
        <span
          className={
            status === "error"
              ? "text-xs text-red-400"
              : "text-xs text-muted-foreground"
          }
        >
          {statusText}
        </span>
      </div>
      <Textarea
        value={value}
        rows={rows}
        placeholder="Write anything…"
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          setStatus("idle");
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => void persist(v), 800);
        }}
        onBlur={flush}
      />
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{hint}</p>
        {carryFromDate && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={carrying || value.trim() === ""}
            onClick={() =>
              startCarry(async () => {
                if (timer.current) {
                  clearTimeout(timer.current);
                  timer.current = null;
                }
                const current = valueRef.current;
                const r = await carryOverDayNote(carryFromDate, current);
                if (!r.ok) {
                  toast.error(r.error);
                  return;
                }
                // The action saved this day's text too.
                savedRef.current = current;
                setStatus("saved");
                toast.success(
                  r.count === 0
                    ? `That note is already on ${prettyDay(r.toDate)}.`
                    : `Note carried over to ${prettyDay(r.toDate)}.`,
                );
              })
            }
          >
            Carry over to next day
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
