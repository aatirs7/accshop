"use client";

import { useCallback, useSyncExternalStore } from "react";

/*
 * A shared wall clock. The overview buckets money by the owner's local
 * day, which the UTC server can't know, so day-based widgets read `now`
 * from this store: null during the server render and hydration (widgets
 * show their empty state), then the real time, ticking every 30s for
 * "3m ago" labels and the midnight rollover. Kept outside React so reading
 * it is pure from the component's point of view.
 */
const TICK_MS = 30_000;
let clockNow = 0;
let clockTimer: number | undefined;
const clockListeners = new Set<() => void>();

function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  if (clockTimer === undefined) {
    clockTimer = window.setInterval(() => {
      clockNow = Date.now();
      for (const l of clockListeners) l();
    }, TICK_MS);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockTimer !== undefined) {
      window.clearInterval(clockTimer);
      clockTimer = undefined;
    }
  };
}

function readClock(): number {
  if (clockNow === 0) clockNow = Date.now();
  return clockNow;
}

function readClockOnServer(): null {
  return null;
}

/** Current time in ms after mount, null before. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribeClock, readClock, readClockOnServer);
}

const PREF_EVENT = "accshop:pref";

function subscribePref(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(PREF_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PREF_EVENT, callback);
  };
}

/**
 * A per-device preference (sound on/off, daily goal) kept in localStorage.
 * Reads through useSyncExternalStore so the server render and first client
 * render agree on the fallback, then snaps to the stored value.
 */
export function useDevicePref(
  key: string,
  fallback: string,
): [string, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribePref,
    () => {
      try {
        return window.localStorage.getItem(key) ?? fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );
  const set = useCallback(
    (next: string) => {
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // Private mode / storage full: the preference just won't persist.
      }
      window.dispatchEvent(new Event(PREF_EVENT));
    },
    [key],
  );
  return [value, set];
}
