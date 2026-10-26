"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { affiliateLiveSessions } from "@/lib/db/schema";
import { requireAffiliate } from "@/lib/affiliates/auth";
import { TIME_RE, liveDurationMinutes } from "@/lib/affiliates/live";
import { DAY_RE, shiftDay } from "@/lib/daily-ops";
import { audit } from "@/lib/audit";
import { getViewerToday } from "@/components/affiliates/live/viewer-today";

export type LiveActionResult = { ok: true } | { ok: false; error: string };

export interface LiveSessionInput {
  sessionDate: string;
  startTime: string;
  endTime: string;
  incomingDms: number | string;
  qualifiedLeads: number | string;
  commonQuestions?: string | null;
  technicalIssues?: string | null;
  notes?: string | null;
}

const MAX_DURATION_MINUTES = 24 * 60;

/** A real calendar date, not just the right shape (rejects 2026-02-31). */
function isRealDay(value: string): boolean {
  if (!DAY_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const count = z.coerce
  .number({ error: "Enter a whole number." })
  .int("Enter a whole number.")
  .min(0, "Counts can't be negative.")
  .max(100_000, "That number is too large.");

const longText = z
  .string()
  .trim()
  .max(2000, "Keep each note under 2000 characters.")
  .nullish()
  .transform((v) => (v ? v : null));

const sessionSchema = z.object({
  sessionDate: z
    .string()
    .trim()
    .refine(isRealDay, "Pick a valid date.")
    .refine((v) => v >= "2020-01-01", "Pick a valid date."),
  startTime: z.string().trim().regex(TIME_RE, "Enter a start time."),
  endTime: z.string().trim().regex(TIME_RE, "Enter an end time."),
  incomingDms: count,
  qualifiedLeads: count,
  commonQuestions: longText,
  technicalIssues: longText,
  notes: longText,
});

type ParsedSession = z.infer<typeof sessionSchema> & { durationMinutes: number };

async function parse(
  input: LiveSessionInput,
): Promise<{ ok: true; data: ParsedSession } | { ok: false; error: string }> {
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const data = parsed.data;

  const today = await getViewerToday();
  if (data.sessionDate > shiftDay(today, 1)) {
    return { ok: false, error: "That date is in the future." };
  }

  // Never trust a client-computed duration.
  const durationMinutes = liveDurationMinutes(data.startTime, data.endTime);
  if (durationMinutes === null) {
    return { ok: false, error: "The end time must be different from the start time." };
  }
  if (durationMinutes > MAX_DURATION_MINUTES) {
    return { ok: false, error: "A LIVE can't be longer than 24 hours." };
  }
  return { ok: true, data: { ...data, durationMinutes } };
}

function revalidate() {
  revalidatePath("/affiliates/live");
  revalidatePath("/affiliates/dashboard");
}

export async function createLiveSession(input: LiveSessionInput): Promise<LiveActionResult> {
  const { user, affiliate } = await requireAffiliate();
  const result = await parse(input);
  if (!result.ok) return result;
  const d = result.data;

  const [row] = await db
    .insert(affiliateLiveSessions)
    .values({
      affiliateId: affiliate.id,
      sessionDate: d.sessionDate,
      startTime: d.startTime,
      endTime: d.endTime,
      durationMinutes: d.durationMinutes,
      incomingDms: d.incomingDms,
      qualifiedLeads: d.qualifiedLeads,
      commonQuestions: d.commonQuestions,
      technicalIssues: d.technicalIssues,
      notes: d.notes,
    })
    .returning({ id: affiliateLiveSessions.id });

  await audit({
    actorUserId: user.id,
    action: "affiliate.live_session.created",
    entityType: "affiliate_live_session",
    entityId: row?.id ?? null,
    metadata: {
      affiliateId: affiliate.id,
      sessionDate: d.sessionDate,
      durationMinutes: d.durationMinutes,
    },
  });
  revalidate();
  return { ok: true };
}

export async function updateLiveSession(
  sessionId: string,
  input: LiveSessionInput,
): Promise<LiveActionResult> {
  const { affiliate } = await requireAffiliate();
  if (typeof sessionId !== "string" || !sessionId) {
    return { ok: false, error: "That report no longer exists." };
  }
  const result = await parse(input);
  if (!result.ok) return result;
  const d = result.data;

  const updated = await db
    .update(affiliateLiveSessions)
    .set({
      sessionDate: d.sessionDate,
      startTime: d.startTime,
      endTime: d.endTime,
      durationMinutes: d.durationMinutes,
      incomingDms: d.incomingDms,
      qualifiedLeads: d.qualifiedLeads,
      commonQuestions: d.commonQuestions,
      technicalIssues: d.technicalIssues,
      notes: d.notes,
    })
    .where(
      and(
        eq(affiliateLiveSessions.id, sessionId),
        eq(affiliateLiveSessions.affiliateId, affiliate.id),
      ),
    )
    .returning({ id: affiliateLiveSessions.id });

  if (updated.length === 0) return { ok: false, error: "That report no longer exists." };
  revalidate();
  return { ok: true };
}

export async function deleteLiveSession(sessionId: string): Promise<LiveActionResult> {
  const { user, affiliate } = await requireAffiliate();
  if (typeof sessionId !== "string" || !sessionId) {
    return { ok: false, error: "That report no longer exists." };
  }

  const deleted = await db
    .delete(affiliateLiveSessions)
    .where(
      and(
        eq(affiliateLiveSessions.id, sessionId),
        eq(affiliateLiveSessions.affiliateId, affiliate.id),
      ),
    )
    .returning({
      id: affiliateLiveSessions.id,
      sessionDate: affiliateLiveSessions.sessionDate,
      durationMinutes: affiliateLiveSessions.durationMinutes,
    });

  if (deleted.length === 0) return { ok: false, error: "That report no longer exists." };

  await audit({
    actorUserId: user.id,
    action: "affiliate.live_session.deleted",
    entityType: "affiliate_live_session",
    entityId: sessionId,
    metadata: {
      affiliateId: affiliate.id,
      sessionDate: deleted[0].sessionDate,
      durationMinutes: deleted[0].durationMinutes,
    },
  });
  revalidate();
  return { ok: true };
}
