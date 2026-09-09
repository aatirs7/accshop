"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import type { RecentSale } from "@/lib/db/queries/reporting";
import { useDevicePref } from "./hooks";
import { armAudio, audioArmed, playMoneyDing } from "./money-sound";
import { burstConfetti, floatMoney } from "./confetti";

const SOUND_PREF = "accshop.saleSound";
const POLL_MS = 10_000;
// Paid-at is stamped inside the order transaction, so a sale can commit a
// beat after a poll that ran with a later `now`. Overlap the windows and
// de-dupe by order code instead of trusting a single cursor.
const OVERLAP_MS = 5_000;

/**
 * Watches for new paid orders while the overview is open and celebrates
 * each one: the money ding, gold confetti, a floating "+$550", a toast, and
 * a refresh so every number on the page rolls up to its new value. Also
 * hosts the sound toggle and a "test the ding" button.
 */
export function SaleCelebrator() {
  const router = useRouter();
  const [soundPref, setSoundPref] = useDevicePref(SOUND_PREF, "on");
  const soundOn = soundPref !== "off";
  const [armed, setArmed] = useState(false);
  // 0 until the first poll returns the server clock, so only sales that
  // land after the page opened get celebrated (never a replay of history).
  const sinceRef = useRef(0);
  const seenRef = useRef(new Set<string>());
  // Mirrored into a ref so the poll loop reads the latest choice without
  // re-subscribing.
  const soundRef = useRef(soundOn);
  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  // Browsers only let a page make noise after a gesture, so the first
  // tap or keypress anywhere on the overview arms the audio context.
  useEffect(() => {
    if (!soundOn) return;
    if (audioArmed()) return;
    const arm = () => {
      void armAudio().then(setArmed);
    };
    window.addEventListener("pointerdown", arm, { once: true });
    window.addEventListener("keydown", arm, { once: true });
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, [soundOn]);

  const celebrate = useCallback(
    (sales: RecentSale[]) => {
      const total = sales.reduce((sum, s) => sum + s.totalCents, 0);
      if (soundRef.current) playMoneyDing();
      burstConfetti();
      floatMoney(`+${formatMoney(total)}`);
      for (const s of sales) {
        toast.success(`Cha-ching! ${formatMoney(s.totalCents)}`, {
          description: `${s.orderCode} · ${s.quantity}× ${s.productName} via ${s.method}`,
          duration: 10_000,
        });
      }
      router.refresh();
    },
    [router],
  );

  useEffect(() => {
    let stopped = false;
    let inflight = false;

    async function poll() {
      if (stopped || inflight || document.visibilityState !== "visible") return;
      inflight = true;
      try {
        const res = await fetch(`/api/admin/sales/live?since=${sinceRef.current}`, {
          cache: "no-store",
        });
        if (!res.ok || stopped) return;
        const data = (await res.json()) as { now: number; sales: RecentSale[] };
        sinceRef.current = Math.max(sinceRef.current, data.now - OVERLAP_MS);
        const fresh = data.sales.filter((s) => !seenRef.current.has(s.orderCode));
        for (const s of fresh) seenRef.current.add(s.orderCode);
        if (fresh.length) celebrate(fresh);
      } catch {
        // Offline or a blip: the next tick tries again.
      } finally {
        inflight = false;
      }
    }

    void poll();
    const timer = window.setInterval(poll, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [celebrate]);

  function toggleSound() {
    const next = !soundOn;
    setSoundPref(next ? "on" : "off");
    if (next) {
      void armAudio().then((ok) => {
        setArmed(ok);
        if (ok) playMoneyDing();
      });
    }
  }

  function testDing() {
    void armAudio().then((ok) => {
      setArmed(ok);
      if (soundRef.current) playMoneyDing();
      burstConfetti({ count: 110 });
      floatMoney(`+${formatMoney(55_000)}`);
      toast.success("Cha-ching! That's what a sale feels like.", {
        description: "Keep this page open and every real sale rings the bell.",
        duration: 6_000,
      });
    });
  }

  const status = !soundOn
    ? "Sale sound off"
    : armed || audioArmed()
      ? "Sale sound on"
      : "Sale sound on · tap anywhere to arm";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full rounded-full bg-brand-success/70 animate-live-pulse" />
          <span className="relative inline-flex size-2 rounded-full bg-brand-success" />
        </span>
        Live · watching for sales
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={toggleSound}
        aria-pressed={soundOn}
        title={status}
      >
        {soundOn ? <Volume2 className="text-brand-gold" /> : <VolumeX />}
        <span className="hidden sm:inline">{status}</span>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={testDing}>
        <PartyPopper className="text-brand-gold" />
        Test the ding
      </Button>
    </div>
  );
}
