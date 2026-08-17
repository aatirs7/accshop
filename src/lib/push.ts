import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { env } from "@/lib/env";

function vapidConfigured() {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

/**
 * Push admin sale / new-order alerts to every device an admin has enabled
 * notifications on. Never throws, a push failure must not take down the
 * checkout or payment flow it's attached to. Dead subscriptions (410/404,
 * the browser dropped them) are pruned as they're hit.
 */
export async function notifyAdmins(payload: {
  title: string;
  body: string;
  url?: string;
}): Promise<void> {
  if (!vapidConfigured()) return;

  try {
    webpush.setVapidDetails(
      env.VAPID_SUBJECT,
      env.VAPID_PUBLIC_KEY!,
      env.VAPID_PRIVATE_KEY!,
    );

    const subs = await db.query.pushSubscriptions.findMany();
    const data = JSON.stringify(payload);

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            data,
          );
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await db
              .delete(pushSubscriptions)
              .where(eq(pushSubscriptions.endpoint, sub.endpoint));
          } else {
            console.error("PUSH SEND FAILED", statusCode, err);
          }
        }
      }),
    );
  } catch (err) {
    console.error("PUSH NOTIFY FAILED", err);
  }
}
