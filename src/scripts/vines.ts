// An easter egg in the hero: click "wild" and two vines come up out of the
// ground, wind round the word like a bean pole (in front of the letters on the
// way up, behind them on the way down), and branch off into leaves and curling
// tendrils. Click again and they shrink back into the ground the way they
// came; the next click grows a new pair. Drawn already grown, and taken away
// at once, for people who've asked for less motion.

const NS = "http://www.w3.org/2000/svg";
const reduce = matchMedia("(prefers-reduced-motion: reduce)");

interface Pt {
  x: number;
  y: number;
  front: boolean;
}

interface Layers {
  back: SVGGElement;
  front: SVGGElement;
}

const STEM = { front: ["#137036", "#2fbf62"], back: ["#0b4d24", "#1f8f47"] };
const LEAF = { front: ["#137036", "#4fd57f"], back: ["#0b4d24", "#26a253"] };

// Small seeded random numbers, so the vines grow the same way every time.
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Walk forward from a point, bending more and more until it curls up like a
// tendril.
function tendril(from: Pt, angle: number, len: number, dir: number, front: boolean, bend = 0.9, steer?: number): Pt[] {
  const n = 44;
  const pts: Pt[] = [];
  let { x, y } = from;
  let a = angle;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (steer !== undefined && t < 0.5) a += Math.atan2(Math.sin(steer - a), Math.cos(steer - a)) * 0.12;
    a += dir * (0.015 + bend * t ** 3);
    const step = (len / n) * (1.25 - 0.75 * t);
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
    pts.push({ x, y, front });
  }
  return pts;
}

function lengths(pts: Pt[]) {
  const out = [0];
  for (let i = 1; i < pts.length; i++) {
    out.push(out[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  return out;
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

const d = (pts: Pt[]) => "M" + pts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join("L");

// How much faster the vines shrink back than they grew.
const SHRINK = 1.4;

class Garden {
  // Every growing animation, so they can all be played backwards.
  private growth: Animation[] = [];
  private swaying: Animation[] = [];
  // Starts each leaf swaying, for when the vine has grown back.
  private sways: (() => void)[] = [];
  retreating = false;

  // Once the vine has been turned round, its animations are paused and
  // driven from this one clock, in ms; left alone, each animation would
  // restart on its own frame and they'd drift apart.
  private clock: number | null = null;
  private rate = 0;
  private frame = 0;
  private last = 0;
  private gone = () => {};

  constructor(
    private layers: Layers,
    readonly animate: boolean,
  ) {}

  // Plays the growth backwards, and calls gone once it's all back in the
  // ground.
  retreat(gone: () => void) {
    this.retreating = true;
    this.gone = gone;
    this.swaying.forEach((a) => a.cancel());
    this.swaying = [];
    this.turn(-SHRINK);
  }

  // Turns a retreat round, growing back from wherever it had got to.
  regrow() {
    this.retreating = false;
    this.turn(1);
  }

  private get end() {
    return Math.max(...this.growth.map((a) => Number(a.effect?.getComputedTiming().endTime ?? 0)));
  }

  private turn(rate: number) {
    if (this.clock === null) {
      // Still growing, the running animations all share the time since it
      // was planted; once grown, it's at the very end.
      const running = this.growth.find((a) => a.playState === "running");
      this.clock = running ? Number(running.currentTime) : this.end;
      this.growth.forEach((a) => a.pause());
    }
    this.rate = rate;
    if (!this.frame) {
      this.last = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  private tick = (now: number) => {
    const end = this.end;
    this.clock = Math.min(end, Math.max(0, this.clock! + (now - this.last) * this.rate));
    this.last = now;
    for (const a of this.growth) a.currentTime = this.clock;
    this.frame = 0;
    if (this.rate < 0 && this.clock <= 0) this.gone();
    else if (this.rate > 0 && this.clock >= end) this.sways.forEach((sway) => sway());
    else this.frame = requestAnimationFrame(this.tick);
  };

  // Draws a strand, splitting it wherever it passes behind the word, and
  // returns the moment the growing tip reaches each of its points.
  strand(pts: Pt[], width: number, start: number, speed: number): number[] {
    const len = lengths(pts);
    const times = len.map((l) => start + l / speed);
    let i = 0;
    while (i < pts.length - 1) {
      let j = i + 1;
      while (j < pts.length - 1 && pts[j + 1].front === pts[i + 1].front) j++;
      const front = pts[i + 1].front;
      const run = pts.slice(i, j + 1);
      const [dark, light] = STEM[front ? "front" : "back"];
      const g = front ? this.layers.front : this.layers.back;
      for (const [color, w] of [
        [dark, width * 1.8],
        [light, width],
      ] as const) {
        const path = el("path", {
          d: d(run),
          fill: "none",
          stroke: color,
          "stroke-width": w,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          pathLength: 1,
        });
        g.append(path);
        if (this.animate) {
          path.style.strokeDasharray = "1 1";
          this.growth.push(
            path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
              delay: times[i] * 1000,
              duration: (times[j] - times[i]) * 1000,
              fill: "both",
            }),
          );
        }
      }
      i = j;
    }
    return times;
  }

  leaf(at: Pt, angle: number, size: number, when: number, rand: () => number) {
    const [dark, light] = LEAF[at.front ? "front" : "back"];
    const outer = el("g", {
      transform: `translate(${at.x.toFixed(2)} ${at.y.toFixed(2)}) rotate(${((angle * 180) / Math.PI).toFixed(1)}) scale(${size.toFixed(2)})`,
    });
    const inner = el("g", {});
    inner.style.transformOrigin = "0 0";
    inner.append(
      el("path", {
        d: "M0 0C.22-.34.72-.42 1 0 .72.42.22.34 0 0Z",
        fill: light,
        stroke: dark,
        "stroke-width": 0.09,
        "stroke-linejoin": "round",
      }),
      el("path", { d: "M.08 0Q.5-.04.86 0", fill: "none", stroke: dark, "stroke-width": 0.06, "stroke-linecap": "round" }),
    );
    outer.append(inner);
    (at.front ? this.layers.front : this.layers.back).append(outer);
    const sway = 4 + rand() * 5;
    if (this.animate) {
      const phase = rand();
      const pop = inner.animate(
        [
          { transform: "scale(0) rotate(-40deg)" },
          { transform: "scale(1.2) rotate(8deg)", offset: 0.6 },
          { transform: "scale(1) rotate(0deg)" },
        ],
        { delay: when * 1000, duration: 520, easing: "cubic-bezier(.3,.7,.4,1)", fill: "both" },
      );
      this.growth.push(pop);
      const start = () => this.sway(inner, sway, phase);
      this.sways.push(start);
      pop.onfinish = start;
    } else if (!reduce.matches) {
      this.sway(inner, sway, rand());
    }
  }

  // Once grown, the leaves stir a little, as if there's a breeze.
  private sway(leaf: SVGGElement, deg: number, phase: number) {
    const a = leaf.animate([{ transform: `rotate(${-deg}deg)` }, { transform: `rotate(${deg}deg)` }], {
      duration: 2600 + phase * 1600,
      delay: -phase * 3000,
      direction: "alternate",
      iterations: Infinity,
      easing: "ease-in-out",
    });
    this.swaying.push(a);
  }
}

interface StemOpts {
  dir: 1 | -1;
  turns: number;
  start: number;
  width: number;
  seed: number;
}

function grow(garden: Garden, w: number, em: number, o: StemOpts) {
  const rand = seeded(o.seed);
  const mid = 0.52 * em;
  const amp = 0.44 * em;
  const x0 = o.dir > 0 ? -0.04 * em : w + 0.04 * em;
  const x1 = o.dir > 0 ? w + 0.04 * em : -0.04 * em;

  // Out of the ground, then round and round the word, rising as it goes.
  const pts: Pt[] = [{ x: x0 - o.dir * 0.03 * em, y: mid + amp + 0.22 * em, front: true }];
  const n = 260;
  const angles: number[] = [0];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const th = 2 * Math.PI * o.turns * t;
    const cy = mid + 0.08 * em - 0.16 * em * t;
    pts.push({
      x: x0 + (x1 - x0) * t + Math.sin(th * 1.7 + o.seed) * 0.02 * em,
      y: cy + amp * (1 - 0.12 * t) * Math.cos(th),
      // Both vines twist the same way round, so one passes in front going
      // up and the other going down.
      front: Math.sin(th) * o.dir > 0,
    });
    angles.push(th);
  }

  // The tip carries on up past the word and curls back over it.
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 4];
  const heading = Math.atan2(last.y - prev.y, last.x - prev.x);
  const tip = tendril(last, heading, 0.7 * em, -o.dir, true, 1.1, -Math.PI / 2 + o.dir * 0.3);
  const stem = [...pts, ...tip];

  const speed = 2.6 * em;
  const times = garden.strand(stem, o.width, o.start, speed);
  const len = lengths(stem);

  // Leaves all along it, turning from side to side, but few where they'd
  // hide the letters.
  let side = 1;
  for (let l = 0.3 * em, i = 1; i < stem.length - 2; i++) {
    if (len[i] < l) continue;
    const p = stem[i];
    const overText = p.front && p.y > 0.22 * em && p.y < 0.85 * em && p.x > 0 && p.x < w;
    if (overText && rand() < 0.75) continue;
    l += (0.3 + rand() * 0.16) * em;
    const a = Math.atan2(stem[i + 1].y - stem[i - 1].y, stem[i + 1].x - stem[i - 1].x);
    garden.leaf(p, a + side * (0.7 + rand() * 0.5), (0.13 + rand() * 0.07) * em, times[i] + 0.05, rand);
    side = -side;
  }

  // Shoots branch off wherever the vine comes over the top of the word,
  // reaching up and out, and curl into tendrils.
  let lastBranch = -Infinity;
  for (let i = 2; i < pts.length - 2; i++) {
    const c = Math.cos(angles[i]);
    if (c > -0.97 || len[i] - lastBranch < 0.5 * em) continue;
    if (rand() < 0.2) continue;
    lastBranch = len[i];
    const a = -Math.PI / 2 + o.dir * (0.25 + rand() * 0.5) * (rand() < 0.7 ? 1 : -1);
    const blen = (0.45 + rand() * 0.35) * em;
    const curl = rand() < 0.5 ? 1 : -1;
    const shoot = [pts[i], ...tendril({ ...pts[i], front: true }, a, blen, curl, true)];
    const st = garden.strand(shoot, o.width * 0.6, times[i], speed * 0.6);
    const bl = lengths(shoot);
    for (const at of [0.35, 0.65]) {
      if (bl[bl.length - 1] < 0.4 * em && at > 0.5) continue;
      const k = bl.findIndex((v) => v >= at * bl[bl.length - 1]);
      const ba = Math.atan2(shoot[k + 1].y - shoot[k - 1].y, shoot[k + 1].x - shoot[k - 1].x);
      garden.leaf(shoot[k], ba + (at < 0.5 ? 0.8 : -0.8), (0.11 + rand() * 0.05) * em, st[k] + 0.05, rand);
    }
  }
}

function uproot(host: HTMLElement) {
  host.querySelectorAll(".vines").forEach((s) => s.remove());
}

function plant(host: HTMLElement, animate: boolean, seeds: [number, number]) {
  uproot(host);
  const word = host.firstElementChild as HTMLElement;
  const em = parseFloat(getComputedStyle(host).fontSize);
  const w = word.offsetWidth;
  const h = word.offsetHeight;
  const pad = em;
  const box = `${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}`;
  const svg = (cls: string) => {
    const s = el("svg", { class: `vines ${cls}`, viewBox: box, "aria-hidden": "true" });
    Object.assign(s.style, { left: `${-pad}px`, top: `${-pad}px`, width: `${w + 2 * pad}px`, height: `${h + 2 * pad}px` });
    return s;
  };
  const back = svg("back");
  const front = svg("front");
  const layers = { back: el("g", {}), front: el("g", {}) };
  back.append(layers.back);
  front.append(layers.front);
  host.append(back, front);

  const garden = new Garden(layers, animate);
  const per = 0.78 * em;
  grow(garden, w, em, { dir: 1, turns: Math.max(1.5, w / per), start: 0.1, width: 0.038 * em, seed: seeds[0] });
  grow(garden, w, em, { dir: -1, turns: Math.max(1.2, w / per - 0.45), start: 0.55, width: 0.03 * em, seed: seeds[1] });
  return garden;
}

for (const host of document.querySelectorAll<HTMLElement>("[data-vines]")) {
  // The first pair is the one that looks best; after that, anything goes.
  let seeds: [number, number] | null = null;
  let garden: Garden | null = null;
  let size = "";
  const gone = () => {
    uproot(host);
    garden = null;
  };
  host.addEventListener("click", () => {
    if (garden?.retreating) {
      garden.regrow();
    } else if (garden) {
      if (garden.animate && !reduce.matches) garden.retreat(gone);
      else gone();
    } else {
      seeds = seeds ? [(Math.random() * 1e6) | 0, (Math.random() * 1e6) | 0] : [7, 23];
      garden = plant(host, !reduce.matches, seeds);
    }
  });
  // Regrown in place, already grown, if the word changes size.
  new ResizeObserver(() => {
    const now = `${host.offsetWidth}x${host.offsetHeight}`;
    if (now === size) return;
    size = now;
    if (garden?.retreating) gone();
    else if (garden && seeds) garden = plant(host, false, seeds);
  }).observe(host);
}

// A module, so its names stay its own.
export {};
