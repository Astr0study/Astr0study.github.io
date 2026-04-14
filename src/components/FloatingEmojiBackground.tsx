import * as React from "react";

type FloatingItem = {
  id: string;
  emoji: string;
  topPct: number;
  leftPct: number;
  sizePx: number;
  driftSec: number;
  parallaxStrength: number;
  parallaxAngleRad: number;
};

const EMOJIS = [
  // Keep to broadly supported emoji to avoid "tofu" (□) on some Windows setups.
  // tech / creative
  "💻",
  "⚙️",
  "🔧",
  "📡",
  "🖥️",
  "📷",
  "🎥",
  "🎬",
  "🎮",
  // coffee / desk
  "☕️",
  // cars / bikes / racing
  "🚗",
  "🏎️",
  "⛽️",
  "🏁",
  "🏍️",
  // camping / nature
  "⛺️",
  "🌲",
  "🌿",
  "🏔️",
  "🔥",
  "🌙",
] as const;

function shuffle<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createRand(seed: number) {
  // xorshift32
  let x = seed || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) / 4294967296) as number;
  };
}

export function FloatingEmojiBackground({ count = 10 }: { count?: number }) {
  const items = React.useMemo<FloatingItem[]>(() => {
    const seed = Math.floor(Math.random() * 2 ** 31) ^ Date.now();
    const rand = createRand(seed);
    const emojiPool = shuffle([...EMOJIS], rand);

    // Stratified layout: distribute evenly across viewport, with small jitter.
    const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
    const rows = Math.max(1, Math.ceil(count / cols));
    const cellW = 100 / cols;
    const cellH = 100 / rows;

    return Array.from({ length: count }, (_, i) => {
      const emoji = emojiPool[i % emojiPool.length];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const jitterX = (rand() - 0.5) * cellW * 0.6;
      const jitterY = (rand() - 0.5) * cellH * 0.6;
      const topPct = Math.min(98, Math.max(2, (row + 0.5) * cellH + jitterY));
      const leftPct = Math.min(98, Math.max(2, (col + 0.5) * cellW + jitterX));

      return {
        id: `float-${i}`,
        emoji,
        topPct,
        leftPct,
        sizePx: Math.round(12 + rand() * 10),
        driftSec: 7 + rand() * 10,
        parallaxStrength: 6 + rand() * 10,
        parallaxAngleRad: (rand() * 2 - 1) * 0.55,
      };
    });
  }, [count]);

  const [parallax, setParallax] = React.useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = React.useState(0);
  const rafRef = React.useRef<number | null>(null);
  const scrollRafRef = React.useRef<number | null>(null);
  const targetRef = React.useRef({ x: 0, y: 0 });
  const scrollTargetRef = React.useRef(0);

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const nx = e.clientX / Math.max(1, window.innerWidth) - 0.5;
      const ny = e.clientY / Math.max(1, window.innerHeight) - 0.5;
      // opposite direction than cursor
      targetRef.current = { x: -nx, y: -ny };
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        setParallax(targetRef.current);
      });
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  React.useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const onScroll = () => {
      scrollTargetRef.current = window.scrollY || 0;
      if (scrollRafRef.current != null) return;
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null;
        setScrollY(scrollTargetRef.current);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollRafRef.current != null) window.cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        // Parallax vs foreground: move background more slowly than scroll/content.
        transform: `translate3d(0, ${Math.round(scrollY * 0.05)}px, 0)`,
        willChange: "transform",
      }}
    >
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            // Softer/longer fades so the gradient doesn't "end" abruptly.
            "radial-gradient(1400px 720px at 50% 118%, hsl(var(--accent) / 0.18) 0%, hsl(var(--accent) / 0.10) 26%, transparent 82%)," +
            "radial-gradient(900px 420px at 18% 112%, hsl(var(--accent) / 0.08) 0%, transparent 72%)," +
            "linear-gradient(to top, hsl(var(--accent) / 0.10) 0%, hsl(var(--accent) / 0.06) 34%, transparent 78%)",
        }}
      />
      <div
        className="absolute inset-0 bg-dither-noise opacity-[0.035] mix-blend-overlay"
        aria-hidden="true"
      />

      {items.map((it) => (
        (() => {
          const c = Math.cos(it.parallaxAngleRad);
          const s = Math.sin(it.parallaxAngleRad);
          const rx = parallax.x * c - parallax.y * s;
          const ry = parallax.x * s + parallax.y * c;
          const tx = rx * it.parallaxStrength;
          const ty = ry * it.parallaxStrength;

          return (
        <div
          key={it.id}
          className="absolute select-none opacity-[0.12] blur-[0.2px]"
          style={{
            top: `${it.topPct}%`,
            left: `${it.leftPct}%`,
            fontSize: `${it.sizePx}px`,
            transform: `translate(${tx}px, ${ty}px)`,
          }}
          aria-hidden="true"
        >
          <span
            className="inline-block motion-safe:animate-float"
            style={{ animationDuration: `${it.driftSec}s` }}
          >
            {it.emoji}
          </span>
        </div>
          );
        })()
      ))}
    </div>
  );
}

