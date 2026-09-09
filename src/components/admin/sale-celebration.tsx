"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { fireConfetti } from "./confetti";
import { playMoneyDing, unlockAudio } from "./money-ding";

interface FeedSale {
  id: string;
  orderCode: string;
  totalCents: number;
  quantity: number;
  productName: string;
  customerName: string | null;
  customerEmail: string;
  paidAt: string;
}

const SOUND_KEY = "accshop.admin.saleSound";
const POLL_MS = 12_000;

// Sound preference lives in localStorage (per device); exposed as an
// external store so the toggle re-renders without a setState-in-effect.
const soundListeners = new Set<() => void>();
function subscribeSound(cb: () => void) {
  soundListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    soundListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function readSound() {
  return window.localStorage.getItem(SOUND_KEY) !== "off";
}
function writeSound(on: boolean) {
  window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  soundListeners.forEach((l) => l());
}

/**
 * Watches for new paid orders while the Overview page is open. When one
 * lands: money ding, confetti, a toast, and a refresh so every number on the
 * page rolls up to its new value. Also hosts the sound on/off toggle and a
 * "test" button (which doubles as the browser's required click-to-unlock
 * for audio).
 */
export function SaleCelebration({ knownIds }: { knownIds: string[] }) {
  const router = useRouter();
  const seen = useRef<Set<string>>(new Set(knownIds));
  const sound = useSyncExternalStore(subscribeSound, readSound, () => true);
  const [armed, setArmed] = useState(false);

  // Any click or key on the page unlocks audio so the ding can play later
  // without the owner having to press the test button first.
  useEffect(() => {
    const unlock = async () => {
      if (await unlockAudio()) setArmed(true);
    };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const celebrate = useCallback(
    (sales: FeedSale[]) => {
      const total = sales.reduce((s, x) => s + x.totalCents, 0);
      if (sound) playMoneyDing();
      fireConfetti({ count: sales.length > 1 ? 260 : 180 });
      const first = sales[0];
      toast.success(
        sales.length === 1
          ? `Cha-ching! ${formatMoney(total)} sale`
          : `Cha-ching! ${sales.length} new sales, ${formatMoney(total)}`,
        {
          description:
            sales.length === 1
              ? `${first.quantity}× ${first.productName} · ${first.customerName ?? first.customerEmail}`
              : sales.map((s) => s.orderCode).join(", "),
          duration: 8000,
        },
      );
      router.refresh();
    },
    [router, sound],
  );

  // Poll while the tab is visible. The seen-set starts with everything the
  // server rendered, so only sales that land after page load celebrate.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch("/api/admin/sales-feed", { cache: "no-store" });
          if (res.ok) {
            const data = (await res.json()) as { sales: FeedSale[] };
            const fresh = data.sales.filter((s) => !seen.current.has(s.id));
            if (fresh.length > 0) {
              for (const s of fresh) seen.current.add(s.id);
              celebrate(fresh);
            }
          }
        } catch {
          // Network hiccup, try again next tick.
        }
      }
      if (!cancelled) timer = setTimeout(poll, POLL_MS);
    };
    timer = setTimeout(poll, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        poll();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [celebrate]);

  function toggleSound() {
    const next = !sound;
    writeSound(next);
    toast(next ? "Money ding on" : "Money ding muted");
  }

  async function test() {
    if (await unlockAudio()) setArmed(true);
    if (sound) playMoneyDing();
    fireConfetti({ count: 140 });
    toast.success("Cha-ching! That's what a sale feels like.", {
      description: "You'll get this every time an order is paid while this page is open.",
    });
  }

  return (
    <div className="flex items-center gap-2">
      {!armed && sound && (
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Click anywhere to arm the sound
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={toggleSound}
        title={sound ? "Mute the money ding" : "Turn the money ding on"}
      >
        {sound ? <Volume2 className="text-brand-gold" /> : <VolumeX />}
        <span className="hidden sm:inline">{sound ? "Ding on" : "Ding off"}</span>
      </Button>
      <Button size="sm" onClick={test} title="Hear the sale ding">
        <PartyPopper />
        Test the ding
      </Button>
    </div>
  );
}
