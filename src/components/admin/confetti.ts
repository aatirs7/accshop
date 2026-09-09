// Dependency-free confetti burst in the brand palette (champagne gold, ivory,
// success green). Draws on a throwaway full-screen canvas and removes it when
// the particles have settled. Respects prefers-reduced-motion.

const COLORS = [
  "oklch(0.83 0.115 85)", // brand gold
  "oklch(0.9 0.09 88)", // pale gold
  "oklch(0.68 0.09 85)", // gold dim
  "oklch(0.96 0.005 90)", // ivory
  "oklch(0.75 0.14 155)", // success green
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  shape: "rect" | "circle";
}

export function fireConfetti(opts: { count?: number } = {}) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "9999",
  } satisfies Partial<CSSStyleDeclaration>);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  const w = window.innerWidth;
  const h = window.innerHeight;
  const count = opts.count ?? 180;
  const particles: Particle[] = [];
  // Two cannons, bottom-left and bottom-right, firing toward the middle.
  for (let i = 0; i < count; i++) {
    const fromLeft = i % 2 === 0;
    const angle =
      (fromLeft ? -75 : -105) * (Math.PI / 180) +
      (Math.random() - 0.5) * (Math.PI / 4);
    const speed = 14 + Math.random() * 12;
    particles.push({
      x: fromLeft ? w * 0.1 : w * 0.9,
      y: h + 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 6 + Math.random() * 6,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: Math.random() < 0.7 ? "rect" : "circle",
    });
  }

  const start = performance.now();
  const duration = 3200;

  function frame(now: number) {
    const elapsed = now - start;
    ctx!.clearRect(0, 0, w, h);
    const fade = elapsed > duration - 600 ? (duration - elapsed) / 600 : 1;
    let alive = 0;
    for (const p of particles) {
      p.vy += 0.45; // gravity
      p.vx *= 0.99;
      p.vy *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
      if (p.y < h + 40) alive++;
      ctx!.save();
      ctx!.globalAlpha = Math.max(0, fade);
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rotation);
      ctx!.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx!.beginPath();
        ctx!.arc(0, 0, p.size / 3, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();
    }
    if (elapsed < duration && alive > 0) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  }
  requestAnimationFrame(frame);
}
