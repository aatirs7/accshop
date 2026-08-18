import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { pushSubscriptions, users } from "@/lib/db/schema";
import { adminEmails, env } from "@/lib/env";

const pushConfigured = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

if (pushConfigured) {
  webpush.setVapidDetails(
    `mailto:${env.SUPPORT_EMAIL}`,
    env.VAPID_PUBLIC_KEY!,
    env.VAPID_PRIVATE_KEY!,
  );
}

interface PushPayload {
  title: string;
  body: string;
  url: string;
}

/**
 * Best-effort push to every admin device that enabled notifications. Mirrors
 * sendEmail's contract: never throws, a failed/expired subscription is
 * pruned rather than retried. No-ops until VAPID keys are set in env (see
 * HANDOFF.md), so it's safe to call before that's configured.
 */
export async function sendPushToAdmins(payload: PushPayload): Promise<void> {
  if (!pushConfigured) return;
  if (adminEmails.length === 0) return;

  try {
    const admins = await db.query.users.findMany({
      where: inArray(users.email, adminEmails),
    });
    if (admins.length === 0) return;

    const subs = await db.query.pushSubscriptions.findMany({
      where: inArray(
        pushSubscriptions.userId,
        admins.map((a) => a.id),
      ),
    });
    if (subs.length === 0) return;

    const body = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            body,
          );
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await db
              .delete(pushSubscriptions)
              .where(eq(pushSubscriptions.id, sub.id));
          } else {
            console.error("Push send failed:", err);
          }
        }
      }),
    );
  } catch (err) {
    console.error("sendPushToAdmins failed:", err);
  }
}
