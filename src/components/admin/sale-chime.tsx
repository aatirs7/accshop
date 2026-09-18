"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

/* How often the open dashboard checks for a new sale. Kept modest so it is
   cheap, but quick enough to feel live when a sale lands. */
const POLL_MS = 15_000;
const MUTE_KEY = "accshop.saleChime.muted";

/**
 * The "ka-ching": two bright bell partials with a fast attack and a ringing
 * decay, synthesized so there is no audio file to ship or license. Reads as a
 * cash-register chime rather than a phone notification.
 */
function chingSound(ctx: AudioContext) {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.4;
  master.connect(ctx.destination);

  const notes = [
    { f: 1046.5, t: 0, d: 0.18 }, // C6 - the "ka"
    { f: 1568.0, t: 0.08, d: 0.5 }, // G6 - the "ching" ring
  ];
  for (const n of notes) {
    const start = now + n.t;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = n.f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.5, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + n.d);
    osc.connect(g);
    g.connect(master);
    osc.start(start);
    osc.stop(start + n.d + 0.05);

    // A quiet octave shimmer on top for the metallic ring.
    const shimmer = ctx.createOscillator();
    shimmer.type = "sine";
    shimmer.frequency.value = n.f * 2.01;
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, start);
    sg.gain.exponentialRampToValueAtTime(0.15, start + 0.006);
    sg.gain.exponentialRampToValueAtTime(0.0001, start + n.d * 0.7);
    shimmer.connect(sg);
    sg.connect(master);
    shimmer.start(start);
    shimmer.stop(start + n.d + 0.05);
  }
}

function makeCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

/**
 * Plays a money "ka-ching" while the admin app is open and a new paid order
 * lands. Polls a tiny heartbeat and chimes when the paid-order count goes up.
 *
 * Note on iOS: web-app push notifications can't carry a custom sound (Apple
 * only allows the system sound), so this covers the "app is open" case. Audio
 * also can't start until the user has interacted with the page, so the context
 * is unlocked on the first tap or key press.
 */
export function SaleChime() {
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const lastCountRef = useRef<number | null>(null);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // One-time hydrate of the saved preference. localStorage is client-only, so
  // it has to happen after mount rather than in the initial state.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMuted(localStorage.getItem(MUTE_KEY) === "1");
    } catch {
      /* storage blocked, default on */
    }
  }, []);

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = makeCtx();
    return ctxRef.current;
  }, []);

  const play = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;
    const go = () => {
      try {
        chingSound(ctx);
      } catch {
        /* ignore */
      }
    };
    if (ctx.state === "suspended") ctx.resume().then(go).catch(() => {});
    else go();
  }, [ensureCtx]);

  // iOS/Safari: the audio context stays suspended until a user gesture.
  useEffect(() => {
    const unlock = () => {
      const ctx = ensureCtx();
      if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [ensureCtx]);

  // Poll for new paid orders; chime on an increase (never on first load).
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const res = await fetch("/api/admin/sales-pulse", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { paidCount?: number };
        const c = Number(data.paidCount);
        if (!Number.isFinite(c)) return;
        if (lastCountRef.current === null) {
          lastCountRef.current = c; // baseline, no chime
          return;
        }
        if (c > lastCountRef.current) {
          lastCountRef.current = c;
          if (!mutedRef.current) play();
        } else if (c < lastCountRef.current) {
          lastCountRef.current = c;
        }
      } catch {
        /* offline or transient, try again next tick */
      }
    };

    const schedule = () => {
      timer = setTimeout(async () => {
        if (!alive) return;
        if (typeof document === "undefined" || document.visibilityState === "visible") {
          await tick();
        }
        schedule();
      }, POLL_MS);
    };

    tick();
    schedule();

    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [play]);

  const toggle = () => {
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      // Turning it on doubles as a preview so you know it works.
      if (!next) play();
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? "Turn sale sound on" : "Turn sale sound off"}
      title={muted ? "Sale sound off" : "Sale sound on"}
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      className={cn(
        "fixed right-4 z-50 grid h-11 w-11 place-items-center rounded-full border border-border/60 bg-card shadow-lg transition-colors",
        muted ? "text-muted-foreground" : "text-brand-gold",
      )}
    >
      {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
    </button>
  );
}
