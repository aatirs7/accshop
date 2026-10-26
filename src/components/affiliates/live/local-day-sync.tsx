"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { localToday } from "@/lib/daily-ops";

/**
 * The server can't know the viewer's timezone, so it renders with the day in
 * the `aff_today` cookie (or UTC). On mount this checks the viewer's real
 * local day and, if the server used a different one, writes the cookie and
 * refreshes once. The ref guard means a blocked cookie can never loop.
 */
export function LocalDaySync({ serverToday }: { serverToday: string }) {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    try {
      const today = localToday();
      document.cookie = `aff_today=${today}; path=/; max-age=172800; SameSite=Lax`;
      if (today !== serverToday) router.refresh();
    } catch {
      // Cookies unavailable; the UTC fallback stays in place.
    }
  }, [serverToday, router]);

  return null;
}
