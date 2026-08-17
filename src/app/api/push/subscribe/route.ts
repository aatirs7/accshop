import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

const subscribeSchema = z.object({
  endpoint: z.string().min(1),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

/**
 * Registers an admin's device for sale / new-order push alerts. Re-POSTing
 * the same endpoint (e.g. the browser refreshed the subscription) just
 * updates the keys rather than erroring.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = subscribeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }
  const { endpoint, keys } = parsed.data;

  await db
    .insert(pushSubscriptions)
    .values({
      userId: session.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: session.user.id, p256dh: keys.p256dh, auth: keys.auth },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = z
    .object({ endpoint: z.string().min(1) })
    .safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, parsed.data.endpoint));

  return NextResponse.json({ ok: true });
}
