"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { affiliates, partners, users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { audit } from "@/lib/audit";
import { canEarn, requireAffiliate } from "@/lib/affiliates/auth";
import {
  codeFormatError,
  isCodeAvailable,
  isUsernameAvailable,
  normalizeCode,
  normalizeUsername,
  usernameFormatError,
} from "@/lib/affiliates/codes";
import { AFFILIATE_DASHBOARD_PATH, PAYOUT_METHODS } from "@/lib/affiliates/constants";

export type OnboardingState = { error: string; field?: string } | null;
export type SettingsResult = { ok: true; message: string } | { ok: false; error: string };
export type AvailabilityResult =
  | { ok: true; value: string }
  | { ok: false; value: string; error: string };

const PAYOUT_VALUES = PAYOUT_METHODS.map((m) => m.value) as [string, ...string[]];

const LOGIN_INSTEAD = "That email already has an account. Please log in instead.";
const COACH_REFUSAL =
  "This email belongs to an ACCSHOP coach account. Coaches earn through the partner program, so it can't also be an affiliate.";

/** The signed-in user's affiliate id, if any. Never trust one from the client. */
async function currentAffiliateId(): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user) return undefined;
  const row = await db.query.affiliates.findFirst({
    where: eq(affiliates.userId, session.user.id),
    columns: { id: true },
  });
  return row?.id;
}

/** Postgres unique violation -> which of our fields collided, if we can tell. */
function uniqueViolation(err: unknown): "code" | "username" | "email" | "user" | "other" | null {
  let e: unknown = err;
  for (let depth = 0; e && depth < 4; depth++) {
    const o = e as { code?: unknown; constraint?: unknown; constraint_name?: unknown; cause?: unknown };
    if (o.code === "23505") {
      const name = String(o.constraint ?? o.constraint_name ?? "");
      if (name.includes("affiliates_code")) return "code";
      if (name.includes("affiliates_username")) return "username";
      if (name.includes("users_email")) return "email";
      if (name.includes("affiliates_user_id")) return "user";
      return "other";
    }
    e = o.cause;
  }
  return null;
}

const RACE_MESSAGES = {
  code: "Someone just took that code. Pick another one.",
  username: "Someone just took that username. Pick another one.",
  email: LOGIN_INSTEAD,
  user: "Your affiliate profile was just created. Refresh the page and log in.",
  other: "That code or username was just taken. Pick another one.",
} as const;

/** Live availability check for the code box (join and settings). */
export async function checkCodeAvailability(raw: string): Promise<AvailabilityResult> {
  const code = normalizeCode(String(raw ?? ""));
  const formatError = codeFormatError(code);
  if (formatError) return { ok: false, value: code, error: formatError };
  const available = await isCodeAvailable(code, await currentAffiliateId());
  return available
    ? { ok: true, value: code }
    : { ok: false, value: code, error: "That code is taken. Pick another one." };
}

/** Live availability check for the username box (join and settings). */
export async function checkUsernameAvailability(raw: string): Promise<AvailabilityResult> {
  const username = normalizeUsername(String(raw ?? ""));
  const formatError = usernameFormatError(username);
  if (formatError) return { ok: false, value: username, error: formatError };
  const available = await isUsernameAvailable(username, await currentAffiliateId());
  return available
    ? { ok: true, value: username }
    : { ok: false, value: username, error: "That username is taken. Pick another one." };
}

const joinSchema = z.object({
  name: z.string().trim().min(1, "Enter your full name.").max(120, "That name is too long."),
  email: z.string().trim().toLowerCase().max(254).optional().default(""),
  // Trimmed because password login trims too; otherwise a trailing space
  // would lock the affiliate out.
  password: z.string().trim().max(200, "That password is too long.").optional().default(""),
  username: z.string().max(40).default(""),
  code: z.string().max(40).default(""),
  payoutMethod: z.enum(PAYOUT_VALUES, { message: "Choose how you want to be paid." }),
  payoutHandle: z
    .string()
    .trim()
    .min(1, "Enter where we should send your payouts.")
    .max(200, "That payout handle is too long."),
  terms: z.literal("on", { message: "Please agree to the Terms to join." }),
});

/**
 * Public affiliate signup (/affiliates/join). Creates or links the user,
 * creates or completes their affiliate profile, signs them in, and sends them
 * to the dashboard. Signed-in users (e.g. legacy affiliates finishing setup)
 * act on their own account; email is ignored for them.
 */
export async function joinAffiliate(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const parsed = joinSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? "Check your details.", field: String(issue?.path[0] ?? "") };
  }
  const input = parsed.data;

  const username = normalizeUsername(input.username);
  const usernameError = usernameFormatError(username);
  if (usernameError) return { error: usernameError, field: "username" };

  const requestedCode = normalizeCode(input.code);
  const codeError = codeFormatError(requestedCode);

  // Work out whose account this is before touching anything.
  const session = await auth();
  let userId: string | null = null;
  let userHasPassword = false;
  let existingName: string | null = null;
  let email: string;

  if (session?.user) {
    const me = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
    if (!me) return { error: "Your session expired. Please log in again." };
    userId = me.id;
    email = me.email;
    userHasPassword = Boolean(me.passwordHash);
    existingName = me.name;
  } else {
    const emailCheck = z.string().email().safeParse(input.email);
    if (!emailCheck.success) return { error: "Enter a valid email address.", field: "email" };
    email = emailCheck.data;
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existing) {
      // Same takeover rule as before: an account that already has a password
      // must log in first. One created at checkout (no password) can claim it.
      if (existing.passwordHash) return { error: LOGIN_INSTEAD, field: "email" };
      userId = existing.id;
      existingName = existing.name;
    }
  }

  // A password is required unless a signed-in user already has one.
  const needsPassword = !userHasPassword;
  if (needsPassword && input.password.length < 8) {
    return { error: "Use at least 8 characters for your password.", field: "password" };
  }

  let existingAffiliate: typeof affiliates.$inferSelect | undefined;
  if (userId) {
    const [partner, aff] = await Promise.all([
      db.query.partners.findFirst({ where: eq(partners.userId, userId), columns: { id: true } }),
      db.query.affiliates.findFirst({ where: eq(affiliates.userId, userId) }),
    ]);
    if (partner) return { error: COACH_REFUSAL };
    existingAffiliate = aff;
  }

  // Code: a legacy affiliate keeps their current code unless they changed it,
  // and only active affiliates may change it.
  let code = requestedCode;
  const codeChanged = !existingAffiliate || existingAffiliate.code !== requestedCode;
  if (codeChanged) {
    if (codeError) return { error: codeError, field: "code" };
    if (existingAffiliate && !canEarn(existingAffiliate)) {
      return {
        error: `Your account is ${existingAffiliate.status}, so your code can't be changed. Keep ${existingAffiliate.code}.`,
        field: "code",
      };
    }
  } else {
    code = existingAffiliate!.code;
  }

  const [codeFree, usernameFree] = await Promise.all([
    codeChanged ? isCodeAvailable(code, existingAffiliate?.id) : Promise.resolve(true),
    isUsernameAvailable(username, existingAffiliate?.id),
  ]);
  if (!codeFree) return { error: "That code is taken. Pick another one.", field: "code" };
  if (!usernameFree) return { error: "That username is taken. Pick another one.", field: "username" };

  const profile = {
    code,
    username,
    payoutMethod: input.payoutMethod,
    payoutHandle: input.payoutHandle,
  };

  let affiliateId: string;
  let finalUserId: string;
  try {
    const result = await db.transaction(async (tx) => {
      let uid = userId;
      if (uid) {
        await tx
          .update(users)
          .set({
            // Signed-in users are editing their own name. For an unclaimed
            // checkout account, keep the name already on file.
            name: session?.user ? input.name : (existingName ?? input.name),
            ...(needsPassword ? { passwordHash: hashPassword(input.password) } : {}),
          })
          .where(eq(users.id, uid));
      } else {
        const [created] = await tx
          .insert(users)
          .values({ email, name: input.name, passwordHash: hashPassword(input.password) })
          .returning({ id: users.id });
        uid = created.id;
      }

      if (existingAffiliate) {
        // Completing a legacy profile. Status is left alone so a suspended
        // affiliate can't reactivate themselves by re-joining.
        await tx.update(affiliates).set(profile).where(eq(affiliates.id, existingAffiliate.id));
        return { uid, affId: existingAffiliate.id };
      }
      const [aff] = await tx
        .insert(affiliates)
        .values({ userId: uid, ...profile, status: "active" })
        .returning({ id: affiliates.id });
      return { uid, affId: aff.id };
    });
    affiliateId = result.affId;
    finalUserId = result.uid;
  } catch (err) {
    const which = uniqueViolation(err);
    if (which) {
      return {
        error: RACE_MESSAGES[which],
        field: which === "code" || which === "username" || which === "email" ? which : undefined,
      };
    }
    console.error("affiliate join failed", err);
    return { error: "Something went wrong. Please try again." };
  }

  if (!session?.user) await createSession(finalUserId);
  await audit({
    actorUserId: finalUserId,
    action: "affiliate.join",
    entityType: "affiliate",
    entityId: affiliateId,
    metadata: {
      code,
      username,
      payoutMethod: input.payoutMethod,
      completedLegacyProfile: Boolean(existingAffiliate),
      ...(existingAffiliate && codeChanged ? { previousCode: existingAffiliate.code } : {}),
    },
  });
  revalidatePath("/affiliates", "layout");
  redirect(AFFILIATE_DASHBOARD_PATH);
}

const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your full name.").max(120, "That name is too long."),
  username: z.string().max(40).default(""),
  payoutMethod: z.enum(PAYOUT_VALUES, { message: "Choose how you want to be paid." }),
  payoutHandle: z
    .string()
    .trim()
    .min(1, "Enter where we should send your payouts.")
    .max(200, "That payout handle is too long."),
});

/** Settings: name, username and payout details. */
export async function updateAffiliateProfile(formData: FormData): Promise<SettingsResult> {
  const { user, affiliate } = await requireAffiliate();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };
  }
  const { name, payoutMethod, payoutHandle } = parsed.data;
  const username = normalizeUsername(parsed.data.username);
  const usernameError = usernameFormatError(username);
  if (usernameError) return { ok: false, error: usernameError };
  if (!(await isUsernameAvailable(username, affiliate.id))) {
    return { ok: false, error: "That username is taken. Pick another one." };
  }

  try {
    await db.transaction(async (tx) => {
      await tx.update(users).set({ name }).where(eq(users.id, user.id));
      await tx
        .update(affiliates)
        .set({ username, payoutMethod, payoutHandle })
        .where(eq(affiliates.id, affiliate.id));
    });
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: RACE_MESSAGES.username };
    console.error("affiliate profile update failed", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  await audit({
    actorUserId: user.id,
    action: "affiliate.profile_updated",
    entityType: "affiliate",
    entityId: affiliate.id,
    metadata: {
      usernameChanged: username !== affiliate.username,
      payoutChanged: payoutMethod !== affiliate.payoutMethod || payoutHandle !== affiliate.payoutHandle,
    },
  });
  revalidatePath("/affiliates", "layout");
  return { ok: true, message: "Profile saved." };
}

/** Settings: change the affiliate code. The old code stops working at once. */
export async function changeAffiliateCode(formData: FormData): Promise<SettingsResult> {
  const { user, affiliate } = await requireAffiliate();
  if (!canEarn(affiliate)) {
    return { ok: false, error: `Your account is ${affiliate.status}, so your code can't be changed.` };
  }
  const code = normalizeCode(String(formData.get("code") ?? ""));
  if (code === affiliate.code) return { ok: false, error: "That is already your code." };
  const formatError = codeFormatError(code);
  if (formatError) return { ok: false, error: formatError };
  if (!(await isCodeAvailable(code, affiliate.id))) {
    return { ok: false, error: "That code is taken. Pick another one." };
  }

  try {
    await db.update(affiliates).set({ code }).where(eq(affiliates.id, affiliate.id));
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: RACE_MESSAGES.code };
    console.error("affiliate code change failed", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  await audit({
    actorUserId: user.id,
    action: "affiliate.code_changed",
    entityType: "affiliate",
    entityId: affiliate.id,
    metadata: { from: affiliate.code, to: code },
  });
  revalidatePath("/affiliates", "layout");
  return { ok: true, message: `Your code is now ${code}.` };
}
