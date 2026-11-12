// An easter egg in the hero: click "Din" and it makes one, a frying pan
// smash, synthesized on the spot. The pan rings at a circular plate's
// out-of-tune overtones, each in a slightly detuned pair so it shimmers, over
// a thwack of noise and a low thud. Each hit is a little different.

let ctx: AudioContext | null = null;

// A circular plate's modes, relative to its lowest.
const MODES = [1, 1.59, 2.14, 2.3, 2.65, 2.92, 3.16, 3.5, 4.06, 4.6];

function noiseBuffer(ac: BaseAudioContext, seconds: number) {
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * seconds), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export function clang() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  strike(ctx, ctx.currentTime + 0.01);
}

// One hit, at time t, on any audio context (an offline one renders it).
export function strike(ac: BaseAudioContext, t: number) {

  const out = ac.createDynamicsCompressor();
  out.threshold.value = -12;
  out.ratio.value = 6;
  const master = ac.createGain();
  master.gain.value = 0.55;
  out.connect(master).connect(ac.destination);

  // The ring.
  const base = 300 + Math.random() * 90;
  MODES.forEach((m, i) => {
    const level = 0.22 / (1 + i * 0.45);
    const decay = 1.6 / (1 + i * 0.35);
    for (const detune of [-1, 1]) {
      const osc = ac.createOscillator();
      osc.type = "sine";
      // Struck metal starts a touch sharp and settles.
      const f = base * m * (1 + detune * 0.0035 + (Math.random() - 0.5) * 0.004);
      osc.frequency.setValueAtTime(f * 1.012, t);
      osc.frequency.exponentialRampToValueAtTime(f, t + 0.08);
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(level, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay * (0.8 + Math.random() * 0.4));
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + decay * 1.3);
    }
  });

  // The thwack.
  const noise = ac.createBufferSource();
  noise.buffer = noiseBuffer(ac, 0.25);
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 2200 + Math.random() * 800;
  band.Q.value = 0.8;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.9, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  noise.connect(band).connect(ng).connect(out);
  noise.start(t);

  // The thud.
  const thud = ac.createOscillator();
  thud.frequency.setValueAtTime(150, t);
  thud.frequency.exponentialRampToValueAtTime(55, t + 0.12);
  const tg = ac.createGain();
  tg.gain.setValueAtTime(0.7, t);
  tg.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  thud.connect(tg).connect(out);
  thud.start(t);
  thud.stop(t + 0.2);
}

const reduce = matchMedia("(prefers-reduced-motion: reduce)");

for (const word of document.querySelectorAll<HTMLElement>("[data-clang]")) {
  word.addEventListener("click", () => {
    clang();
    if (reduce.matches) return;
    // The word takes the hit too: squashed, then shaking it off.
    word.animate(
      [
        { scale: "1 1", rotate: "0deg" },
        { scale: "1.18 0.8", rotate: "-4deg", offset: 0.12 },
        { scale: "0.94 1.08", rotate: "3deg", offset: 0.3 },
        { scale: "1.03 0.97", rotate: "-2deg", offset: 0.5 },
        { scale: "1 1", rotate: "1deg", offset: 0.7 },
        { scale: "1 1", rotate: "0deg" },
      ],
      { duration: 650, easing: "ease-out", composite: "add" },
    );
  });
}
