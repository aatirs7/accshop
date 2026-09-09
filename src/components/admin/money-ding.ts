// Synthesised cash-register "cha-ching" for the admin Overview page. Built
// with the Web Audio API so there's no audio file to load and it plays
// instantly. Browsers only allow sound after the user has interacted with
// the page, so `unlockAudio` should be wired to a click/keypress.

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** Resume the audio context inside a user gesture so later dings can play. */
export async function unlockAudio(): Promise<boolean> {
  const c = getContext();
  if (!c) return false;
  if (c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      return false;
    }
  }
  return c.state === "running";
}

function bell(
  c: AudioContext,
  at: number,
  freq: number,
  gain: number,
  decay: number,
) {
  const partials = [1, 2.0, 2.98];
  partials.forEach((ratio, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * ratio;
    const level = gain / (i + 1);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(level, at + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, at + decay / (i * 0.4 + 1));
    osc.connect(g).connect(c.destination);
    osc.start(at);
    osc.stop(at + decay + 0.05);
  });
}

function click(c: AudioContext, at: number) {
  // Short filtered noise burst: the register drawer's "cha".
  const length = Math.floor(c.sampleRate * 0.06);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 2500;
  const g = c.createGain();
  g.gain.value = 0.35;
  src.connect(filter).connect(g).connect(c.destination);
  src.start(at);
}

/** Play the money ding. Returns false if audio isn't unlocked yet. */
export function playMoneyDing(): boolean {
  const c = getContext();
  if (!c || c.state !== "running") return false;
  const t = c.currentTime + 0.01;
  click(c, t);
  bell(c, t + 0.06, 2093, 0.5, 1.4); // C7
  bell(c, t + 0.2, 2637, 0.45, 1.8); // E7
  bell(c, t + 0.3, 3136, 0.3, 2.2); // G7 shimmer
  return true;
}
