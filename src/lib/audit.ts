import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

/**
 * Append-only audit trail. Written for every credential reveal (attempted or
 * successful) and every admin mutation. Never throws, an audit failure must
 * not take down the action it records, but it is logged loudly.
 */
export async function audit(entry: {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    let ip: string | null = null;
    let userAgent: string | null = null;
    try {
      const h = await headers();
      ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
      userAgent = h.get("user-agent");
    } catch {
      // headers() unavailable outside a request scope (cron, scripts)
    }
    await db.insert(auditLogs).values({
      actorUserId: entry.actorUserId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata ?? null,
      ip,
      userAgent,
    });
  } catch (err) {
    console.error("AUDIT WRITE FAILED", entry.action, err);
  }
}
