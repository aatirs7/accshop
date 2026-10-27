"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { affiliateCommissions, affiliates, orders, partners, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import {
  codeFormatError,
  isCodeAvailable,
  isUsernameAvailable,
  normalizeCode,
  normalizeUsername,
  usernameFormatError,
} from "@/lib/affiliates/codes";
import { setAffiliateCommissionStatus } from "@/lib/affiliates/commissions";
import { normalizeCommissionStatus } from "@/lib/affiliates/constants";
import type { ActionResult } from "./orders";

const idSchema = z.string().trim().min(1).max(100);

function revalidateAffiliates(affiliateId?: string) {
  revalidatePath("/admin/affiliates");
  if (affiliateId) revalidatePath(`/admin/affiliates/${affiliateId}`);
  else revalidatePath("/admin/affiliates/[id]", "page");
}

// ---------------------------------------------------------------------------
// Add affiliate
// ---------------------------------------------------------------------------

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().min(1).max(40),
  username: z.string().trim().max(40).optional(),
});

/**
 * Admin-created affiliate. Finds or creates the user by email, then gives
 * them an affiliate profile with the chosen code. They sign in with the
 * magic link at /login. Refuses coaches (partners) and existing affiliates.
 */
export async function createAffiliate(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Enter a name, an email and a code." };
  }
  const { name, email } = parsed.data;

  const code = normalizeCode(parsed.data.code);
  const codeError = codeFormatError(code);
  if (codeError) return { ok: false, error: codeError };

  const username = parsed.data.username ? normalizeUsername(parsed.data.username) : "";
  if (username) {
    const usernameError = usernameFormatError(username);
    if (usernameError) return { ok: false, error: usernameError };
  }

  let user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (user) {
    if (user.role === "partner") {
      return { ok: false, error: "That email belongs to a coach. Coaches can't also be affiliates." };
    }
    const partner = await db.query.partners.findFirst({
      where: eq(partners.userId, user.id),
      columns: { id: true },
    });
    if (partner) {
      return { ok: false, error: "That email belongs to a coach. Coaches can't also be affiliates." };
    }
    const existing = await db.query.affiliates.findFirst({
      where: eq(affiliates.userId, user.id),
      columns: { id: true },
    });
    if (existing) return { ok: false, error: "That person is already an affiliate." };
  }

  if (!(await isCodeAvailable(code))) {
    return { ok: false, error: "That code is already taken." };
  }
  if (username && !(await isUsernameAvailable(username))) {
    return { ok: false, error: "That username is already taken." };
  }

  let createdUser = false;
  if (!user) {
    [user] = await db.insert(users).values({ email, name }).returning();
    createdUser = true;
  } else if (!user.name) {
    await db.update(users).set({ name }).where(eq(users.id, user.id));
  }

  const [affiliate] = await db
    .insert(affiliates)
    .values({ userId: user.id, code, username: username || null })
    .returning({ id: affiliates.id });

  await audit({
    actorUserId: admin.id,
    action: "affiliate.created_by_admin",
    entityType: "affiliate",
    entityId: affiliate.id,
    metadata: { email, code, username: username || null, createdUser },
  });
  revalidateAffiliates(affiliate.id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Profile controls
// ---------------------------------------------------------------------------

const statusSchema = z.enum(["active", "suspended", "deactivated"]);

export async function setAffiliateStatus(
  affiliateId: string,
  status: "active" | "suspended" | "deactivated",
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = z.object({ id: idSchema, status: statusSchema }).safeParse({ id: affiliateId, status });
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  const row = await db.query.affiliates.findFirst({
    where: eq(affiliates.id, parsed.data.id),
    columns: { id: true, status: true },
  });
  if (!row) return { ok: false, error: "That affiliate no longer exists." };
  if (row.status === parsed.data.status) return { ok: true };

  await db.update(affiliates).set({ status: parsed.data.status }).where(eq(affiliates.id, row.id));
  await audit({
    actorUserId: admin.id,
    action: "affiliate.status_changed",
    entityType: "affiliate",
    entityId: row.id,
    metadata: { from: row.status, to: parsed.data.status },
  });
  revalidateAffiliates(row.id);
  return { ok: true };
}

const goalsSchema = z.object({
  affiliateId: idSchema,
  hours: z.coerce.number().int().min(0).max(168),
  sessions: z.coerce.number().int().min(0).max(100),
});

export async function setAffiliateGoals(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = goalsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Hours must be 0 to 168 and sessions 0 to 100, whole numbers." };
  }
  const { affiliateId, hours, sessions } = parsed.data;
  const row = await db.query.affiliates.findFirst({
    where: eq(affiliates.id, affiliateId),
    columns: { id: true, weeklyLiveHoursGoal: true, weeklyLiveSessionsGoal: true },
  });
  if (!row) return { ok: false, error: "That affiliate no longer exists." };

  await db
    .update(affiliates)
    .set({ weeklyLiveHoursGoal: hours, weeklyLiveSessionsGoal: sessions })
    .where(eq(affiliates.id, row.id));
  await audit({
    actorUserId: admin.id,
    action: "affiliate.goals_changed",
    entityType: "affiliate",
    entityId: row.id,
    metadata: {
      from: { hours: row.weeklyLiveHoursGoal, sessions: row.weeklyLiveSessionsGoal },
      to: { hours, sessions },
    },
  });
  revalidateAffiliates(row.id);
  return { ok: true };
}

/** Read-only availability check for the code editor. */
export async function checkAffiliateCode(
  raw: string,
  exceptAffiliateId?: string,
): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  await requireAdmin();
  const code = normalizeCode(String(raw ?? "").slice(0, 40));
  const formatError = codeFormatError(code);
  if (formatError) return { ok: false, error: formatError };
  if (!(await isCodeAvailable(code, exceptAffiliateId))) {
    return { ok: false, error: "That code is already taken." };
  }
  return { ok: true, code };
}

const codeSchema = z.object({ affiliateId: idSchema, code: z.string().trim().min(1).max(40) });

export async function changeAffiliateCode(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = codeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Enter a code." };

  const code = normalizeCode(parsed.data.code);
  const formatError = codeFormatError(code);
  if (formatError) return { ok: false, error: formatError };

  const row = await db.query.affiliates.findFirst({
    where: eq(affiliates.id, parsed.data.affiliateId),
    columns: { id: true, code: true },
  });
  if (!row) return { ok: false, error: "That affiliate no longer exists." };
  if (row.code === code) return { ok: true };
  if (!(await isCodeAvailable(code, row.id))) {
    return { ok: false, error: "That code is already taken." };
  }

  await db.update(affiliates).set({ code }).where(eq(affiliates.id, row.id));
  await audit({
    actorUserId: admin.id,
    action: "affiliate.code_changed",
    entityType: "affiliate",
    entityId: row.id,
    metadata: { from: row.code, to: code },
  });
  revalidateAffiliates(row.id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

const deleteSchema = z.array(idSchema).min(1).max(500);

/**
 * Delete affiliate profiles, for clearing out fake or filler signups. Anyone
 * with a live commission (pending, approved or paid) is skipped so money
 * history is never lost; deactivate those instead. Their LIVE reports and any
 * reversed commissions go with the profile, orders keep the code they were
 * placed with but lose the link. The user account itself is left alone.
 */
export async function deleteAffiliates(
  affiliateIds: string[],
): Promise<ActionResult & { deleted?: number; skipped?: number }> {
  const admin = await requireAdmin();
  const parsed = deleteSchema.safeParse(affiliateIds);
  if (!parsed.success) return { ok: false, error: "Pick at least one affiliate." };
  const ids = [...new Set(parsed.data)];

  const rows = await db
    .select({ id: affiliates.id, code: affiliates.code, username: affiliates.username, email: users.email })
    .from(affiliates)
    .innerJoin(users, eq(users.id, affiliates.userId))
    .where(inArray(affiliates.id, ids));
  if (rows.length === 0) return { ok: false, error: "Those affiliates no longer exist." };

  const withMoney = new Set(
    (
      await db
        .selectDistinct({ id: affiliateCommissions.affiliateId })
        .from(affiliateCommissions)
        .where(
          and(
            inArray(affiliateCommissions.affiliateId, rows.map((r) => r.id)),
            ne(affiliateCommissions.status, "reversed"),
          ),
        )
    ).map((r) => r.id),
  );
  const doomed = rows.filter((r) => !withMoney.has(r.id));
  if (doomed.length === 0) {
    return {
      ok: false,
      error:
        rows.length === 1
          ? "This affiliate has commissions, so they can't be deleted. Deactivate them instead."
          : "All of these have commissions, so they can't be deleted. Deactivate them instead.",
    };
  }

  const doomedIds = doomed.map((r) => r.id);
  await db.update(orders).set({ affiliateId: null }).where(inArray(orders.affiliateId, doomedIds));
  await db.delete(affiliates).where(inArray(affiliates.id, doomedIds));

  for (const r of doomed) {
    await audit({
      actorUserId: admin.id,
      action: "affiliate.deleted",
      entityType: "affiliate",
      entityId: r.id,
      metadata: { code: r.code, username: r.username, email: r.email },
    });
  }
  revalidateAffiliates();
  return { ok: true, deleted: doomed.length, skipped: rows.length - doomed.length };
}

// ---------------------------------------------------------------------------
// Commission moves
// ---------------------------------------------------------------------------

const moveSchema = z
  .object({
    commissionId: idSchema,
    to: z.enum(["pending", "approved", "paid", "reversed"]),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.to !== "reversed" || (v.reason?.length ?? 0) >= 3, {
    message: "Give a short reason for the reversal.",
  });

/**
 * Move one commission: approve, mark paid, reverse (with a reason), send
 * back to pending, or reopen a reversal. Allowed moves are enforced by the
 * foundation helper.
 */
export async function moveAffiliateCommission(
  commissionId: string,
  to: "pending" | "approved" | "paid" | "reversed",
  reason?: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = moveSchema.safeParse({ commissionId, to, reason });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const before = await db.query.affiliateCommissions.findFirst({
    where: eq(affiliateCommissions.id, parsed.data.commissionId),
    columns: { id: true, affiliateId: true, status: true, amountCents: true, orderId: true },
  });
  if (!before) return { ok: false, error: "That commission no longer exists." };

  const result = await setAffiliateCommissionStatus(
    before.id,
    parsed.data.to,
    parsed.data.to === "reversed" ? parsed.data.reason : undefined,
  );
  if (!result.ok) return result;

  await audit({
    actorUserId: admin.id,
    action: `affiliate.commission_${parsed.data.to}`,
    entityType: "affiliate_commission",
    entityId: before.id,
    metadata: {
      affiliateId: before.affiliateId,
      orderId: before.orderId,
      amountCents: before.amountCents,
      from: normalizeCommissionStatus(before.status),
      to: parsed.data.to,
      reason: parsed.data.to === "reversed" ? parsed.data.reason : undefined,
    },
  });
  revalidateAffiliates(before.affiliateId);
  return { ok: true };
}

/**
 * Bulk moves: approve every pending commission, or mark every approved one
 * paid. Scoped to one affiliate when an id is given.
 */
async function bulkMove(
  from: "pending" | "approved",
  to: "approved" | "paid",
  affiliateId?: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (affiliateId !== undefined && !idSchema.safeParse(affiliateId).success) {
    return { ok: false, error: "Invalid affiliate." };
  }
  const statuses = from === "pending" ? ["pending", "accrued"] : ["approved"];
  const rows = await db
    .select({
      id: affiliateCommissions.id,
      affiliateId: affiliateCommissions.affiliateId,
      amountCents: affiliateCommissions.amountCents,
    })
    .from(affiliateCommissions)
    .where(
      affiliateId
        ? and(
            eq(affiliateCommissions.affiliateId, affiliateId),
            inArray(affiliateCommissions.status, statuses as ("pending" | "accrued" | "approved")[]),
          )
        : inArray(affiliateCommissions.status, statuses as ("pending" | "accrued" | "approved")[]),
    );
  if (rows.length === 0) {
    return { ok: false, error: from === "pending" ? "Nothing pending." : "Nothing approved." };
  }

  const moved: typeof rows = [];
  for (const r of rows) {
    const res = await setAffiliateCommissionStatus(r.id, to);
    if (res.ok) moved.push(r);
  }

  await audit({
    actorUserId: admin.id,
    action: to === "approved" ? "affiliate.commissions_bulk_approved" : "affiliate.commissions_bulk_paid",
    entityType: affiliateId ? "affiliate" : "affiliate_commission",
    entityId: affiliateId ?? null,
    metadata: {
      count: moved.length,
      totalCents: moved.reduce((s, r) => s + r.amountCents, 0),
      commissionIds: moved.map((r) => r.id),
    },
  });
  revalidateAffiliates(affiliateId);
  return { ok: true };
}

export async function approveAllPendingCommissions(affiliateId?: string): Promise<ActionResult> {
  return bulkMove("pending", "approved", affiliateId);
}

/** Mark every approved commission for one affiliate paid, after sending the money. */
export async function markAffiliateCommissionsPaid(affiliateId: string): Promise<ActionResult> {
  return bulkMove("approved", "paid", affiliateId);
}
