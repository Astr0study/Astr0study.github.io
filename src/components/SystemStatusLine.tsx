import * as React from "react";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function formatUptime(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function makeBar(pct: number, size = 10) {
  const p = clamp(pct, 0, 100);
  const filled = Math.round((p / 100) * size);
  return `[${"|".repeat(filled)}${"-".repeat(size - filled)}]`;
}

function usePrefersReducedMotion() {
  const [prefersReduced, setPrefersReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return prefersReduced;
}

export function SystemStatusLine({ revealDelayMs = 0 }: { revealDelayMs?: number }) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const bootMsRef = React.useRef<number>(typeof performance !== "undefined" ? performance.now() : Date.now());
  const [uptimeSec, setUptimeSec] = React.useState(0);
  const [cpuLoadPct] = React.useState(() => Math.floor(Math.random() * 101));
  const [pingMs, setPingMs] = React.useState(() => Math.floor(Math.random() * 101));

  const statusPrefixText = "root@abnmarty:~$ ";
  const [typedStatusPrefix, setTypedStatusPrefix] = React.useState(prefersReducedMotion ? statusPrefixText : "");
  const [showStatusCaret, setShowStatusCaret] = React.useState(!prefersReducedMotion);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
      setUptimeSec((nowMs - bootMsRef.current) / 1000);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  React.useEffect(() => {
    // change ping every few seconds
    const id = window.setInterval(() => {
      setPingMs(Math.floor(Math.random() * 101));
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  React.useEffect(() => {
    if (prefersReducedMotion) {
      setTypedStatusPrefix(statusPrefixText);
      setShowStatusCaret(false);
      return;
    }

    let i = 0;
    setTypedStatusPrefix("");
    setShowStatusCaret(true);
    const stepMs = 14;
    const id = window.setInterval(() => {
      i += 1;
      setTypedStatusPrefix(statusPrefixText.slice(0, i));
      if (i >= statusPrefixText.length) {
        window.clearInterval(id);
        window.setTimeout(() => setShowStatusCaret(false), 2000);
      }
    }, stepMs);
    return () => window.clearInterval(id);
  }, [prefersReducedMotion, statusPrefixText]);

  return (
    <section className="pb-2 page-reveal" style={{ ["--d" as any]: `${revealDelayMs}ms` }}>
      <div className="px-4 sm:px-6">
        <div className="inline-flex w-fit max-w-[calc(100vw-2rem)] flex-wrap rounded-md border border-border/60 bg-background/30 px-3 py-2 font-mono text-[11px] leading-none text-muted-foreground/90 backdrop-blur">
          <span className={showStatusCaret ? "code-type-block code-caret" : "code-type-block"}>{typedStatusPrefix}</span>
          <span className="text-accent/90">{`status --live`}</span>
          <span className="text-muted-foreground/60">{` | `}</span>
          <span>{`uptime: `}</span>
          <span className="tabular-nums text-foreground/90">{formatUptime(uptimeSec)}</span>
          <span className="text-muted-foreground/60">{` | `}</span>
          <span>{`CPU_LOAD: `}</span>
          <span className="tabular-nums text-foreground/90">{makeBar(cpuLoadPct)}</span>
          <span className="ml-2 tabular-nums text-accent/90">{`${String(cpuLoadPct).padStart(2, "0")}%`}</span>
          <span className="text-muted-foreground/60">{` | `}</span>
          <span>{`ping: `}</span>
          <span className="tabular-nums text-foreground/90">{`${pingMs}ms`}</span>
        </div>
      </div>
    </section>
  );
}

