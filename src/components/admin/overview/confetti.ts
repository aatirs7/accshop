/**
 * Champagne-gold confetti cannons and a floating "+$550" for the moment a
 * sale lands. Plain canvas + DOM, no dependency, and both respect
 * prefers-reduced-motion.
 */

const GOLDS = ["#e6c77a", "#f3dda3", "#c9a24f", "#fff7dc", "#b8892e", "#ffffff"];

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  tilt: number;
  color: string;
};

export function burstConfetti(opts: { count?: number; duration?: number } = {}) {
  if (typeof document === "undefined" || reducedMotion()) return;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "9999",
  });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  const count = opts.count ?? 170;
  const duration = opts.duration ?? 3200;
  const parts: Particle[] = Array.from({ length: count }, () => {
    const fromLeft = Math.random() < 0.5;
    // Fire up and inward from the bottom corners.
    const spread = (Math.random() - 0.5) * (Math.PI / 5);
    const angle = (fromLeft ? -Math.PI / 4 : (-3 * Math.PI) / 4) + spread;
    const speed = 11 + Math.random() * 11;
    return {
      x: fromLeft ? -8 : W + 8,
      y: H * 0.75 + Math.random() * H * 0.2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      w: 5 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      tilt: Math.random() * Math.PI * 2,
      color: GOLDS[Math.floor(Math.random() * GOLDS.length)],
    };
  });

  const started = performance.now();
  let raf = 0;
  const frame = (t: number) => {
    const elapsed = t - started;
    ctx.clearRect(0, 0, W, H);
    let alive = 0;
    const fade = elapsed > duration - 600 ? Math.max(0, (duration - elapsed) / 600) : 1;
    for (const p of parts) {
      p.vy += 0.32;
      p.vx *= 0.99;
      p.vy *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.tilt += 0.12;
      if (p.y > H + 20) continue;
      alive += 1;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(Math.cos(p.tilt), 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (alive > 0 && elapsed < duration) {
      raf = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(raf);
      canvas.remove();
    }
  };
  raf = requestAnimationFrame(frame);
}

/** A big gold "+$550" that floats up from the middle of the screen. */
export function floatMoney(text: string) {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.textContent = text;
  el.className =
    "pointer-events-none fixed left-1/2 top-1/2 z-[9999] font-display text-6xl font-semibold text-brand-gold drop-shadow-[0_0_24px_rgba(230,199,122,0.6)] animate-money-float";
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), reducedMotion() ? 1200 : 1900);
}
