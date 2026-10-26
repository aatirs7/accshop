import { cookies } from "next/headers";
import { isDayKey, shiftDay } from "@/lib/daily-ops";

/** Cookie the client writes with the viewer's local calendar day. */
export const VIEWER_TODAY_COOKIE = "aff_today";

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Turn the raw cookie value into a trusted day key. Every real timezone sits
 * within one calendar day of UTC, so anything further out (or malformed) is
 * ignored and we fall back to the UTC date.
 */
export function resolveViewerToday(raw: string | undefined | null): string {
  const utc = utcToday();
  if (!isDayKey(raw)) return utc;
  if (raw < shiftDay(utc, -1) || raw > shiftDay(utc, 1)) return utc;
  return raw;
}

/** The viewer's local "today" (YYYY-MM-DD) on the server. Never throws. */
export async function getViewerToday(): Promise<string> {
  try {
    const jar = await cookies();
    return resolveViewerToday(jar.get(VIEWER_TODAY_COOKIE)?.value);
  } catch {
    return utcToday();
  }
}
