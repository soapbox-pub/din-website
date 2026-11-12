// Din's default cursor effect, on the website too: a click sets off a little
// firework. Off for people who've asked for less motion.

const canvas = document.getElementById("fireworks") as HTMLCanvasElement | null;
const reduce = matchMedia("(prefers-reduced-motion: reduce)");

// Light purples, a little lighter and darker than each other so the sparks
// still glint.
const COLORS = ["#c9a7ff", "#d9c2ff", "#b98cff", "#e8dcff", "#bf9bff"];

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

if (canvas) {
  const ctx = canvas.getContext("2d")!;
  const sparks: Spark[] = [];
  let running = false;
  let dpr = 1;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
  };
  resize();
  addEventListener("resize", resize);

  const burst = (x: number, y: number) => {
    const n = 26 + Math.floor(Math.random() * 10);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 2.2 + Math.random() * 3.6;
      sparks.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 1.2,
        life: 0,
        max: 38 + Math.random() * 26,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 1.6 + Math.random() * 2.4,
      });
    }
    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
  };

  const tick = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.globalCompositeOperation = "lighter";
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life++;
      s.vx *= 0.96;
      s.vy = s.vy * 0.96 + 0.09;
      s.x += s.vx;
      s.y += s.vy;
      const t = 1 - s.life / s.max;
      if (t <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = t;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * (0.4 + t * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (sparks.length) requestAnimationFrame(tick);
    else running = false;
  };

  addEventListener("pointerdown", (e) => {
    if (reduce.matches || e.pointerType === "touch") return;
    burst(e.clientX, e.clientY);
  });
}
