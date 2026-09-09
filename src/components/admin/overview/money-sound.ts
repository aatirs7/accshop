/**
 * The "cha-ching". Synthesised with the Web Audio API (a register click
 * followed by two bright coin strikes) so there's no audio file to host and
 * it plays instantly. Browsers only allow sound after a user gesture, so the
 * page "arms" the context on the first tap/keypress (see SaleCelebrator).
 */

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

export function audioArmed(): boolean {
  return ctx?.state === "running";
}

/** Create/resume the audio context. Call from a user gesture. */
export async function armAudio(): Promise<boolean> {
  const c = getContext();
  if (!c) return false;
  if (c.state !== "running") {
    try {
      await c.resume();
    } catch {
      return false;
    }
  }
  return c.state === "running";
}

/** Play the money ding. Returns false if audio isn't armed yet. */
export function playMoneyDing(): boolean {
  const c = ctx;
  if (!c || c.state !== "running") return false;

  const t0 = c.currentTime;
  const master = c.createGain();
  master.gain.value = 0.35;
  master.connect(c.destination);

  // Register "ka": a short band-passed noise click.
  const clickLen = Math.floor(c.sampleRate * 0.05);
  const buffer = c.createBuffer(1, clickLen, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < clickLen; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / clickLen);
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 2600;
  band.Q.value = 1.4;
  const clickGain = c.createGain();
  clickGain.gain.setValueAtTime(0.5, t0);
  clickGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.05);
  noise.connect(band).connect(clickGain).connect(master);
  noise.start(t0);
  noise.stop(t0 + 0.06);

  // "Ching": bell strikes with inharmonic partials so they ring metallic.
  const strike = (at: number, base: number, dur: number, vol: number) => {
    const partials: [number, number][] = [
      [1, 1],
      [2.76, 0.45],
      [5.4, 0.18],
    ];
    for (const [ratio, level] of partials) {
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.value = base * ratio;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol * level, at + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      osc.connect(g).connect(master);
      osc.start(at);
      osc.stop(at + dur + 0.05);
    }
  };
  strike(t0 + 0.03, 1975, 0.55, 0.7); // B6
  strike(t0 + 0.16, 2637, 1.2, 0.8); // E7

  return true;
}
