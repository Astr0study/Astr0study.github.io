import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FloatingEmojiBackground } from "@/components/FloatingEmojiBackground";
import * as React from "react";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function formatTime(date: Date) {
  return date.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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

const App = () => {
  const [now, setNow] = React.useState(() => new Date());
  const prefersReducedMotion = usePrefersReducedMotion();

  const breadcrumbText = "projects/creative/website/current_project";
  const [typedBreadcrumb, setTypedBreadcrumb] = React.useState(prefersReducedMotion ? breadcrumbText : "");
  const [showBreadcrumbCaret, setShowBreadcrumbCaret] = React.useState(!prefersReducedMotion);
  const spinnerFrames = React.useMemo(() => ["/", "-", "\\", "|"] as const, []);
  const [spinnerIdx, setSpinnerIdx] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  React.useEffect(() => {
    if (prefersReducedMotion) return;
    const id = window.setInterval(() => {
      setSpinnerIdx((i) => (i + 1) % spinnerFrames.length);
    }, 140);
    return () => window.clearInterval(id);
  }, [prefersReducedMotion, spinnerFrames.length]);

  React.useEffect(() => {
    if (prefersReducedMotion) {
      setTypedBreadcrumb(breadcrumbText);
      setShowBreadcrumbCaret(false);
      return;
    }

    let i = 0;
    setTypedBreadcrumb("");
    setShowBreadcrumbCaret(true);
    const stepMs = 12;
    const id = window.setInterval(() => {
      i += 1;
      setTypedBreadcrumb(breadcrumbText.slice(0, i));
      if (i >= breadcrumbText.length) {
        window.clearInterval(id);
        // keep caret subtle; stop after a bit so it doesn't distract
        window.setTimeout(() => setShowBreadcrumbCaret(false), 2600);
      }
    }, stepMs);
    return () => window.clearInterval(id);
  }, [breadcrumbText, prefersReducedMotion]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="relative min-h-screen">
          <FloatingEmojiBackground count={12} />
          <div className="relative z-10">
            <header className="sticky top-0 z-20 w-full border-b border-border/60 bg-background/40 backdrop-blur">
              <div className="mx-auto flex h-10 max-w-5xl items-center justify-between px-4">
                <div className="flex items-center gap-3 text-xs font-mono tracking-tight text-muted-foreground/90">
                  <span className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-2 py-1">
                    <span className="text-accent">{`//`}</span>
                    <span>{`status`}</span>
                  </span>
                  <span className="hidden sm:inline rounded-md border border-border/60 bg-background/40 px-2 py-1 text-muted-foreground/80">
                    <span className="text-accent/90">{`cd`}</span>
                    <span className="mx-2 text-muted-foreground/60">{`>`}</span>
                    <span className={showBreadcrumbCaret ? "code-type-block code-caret" : "code-type-block"}>{typedBreadcrumb}</span>
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono tracking-tight">
                  <span className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-2 py-1 text-muted-foreground/90">
                    <span className="text-accent">{`[`}</span>
                    <span className="tabular-nums text-foreground/90">{prefersReducedMotion ? "/" : spinnerFrames[spinnerIdx]}</span>
                    <span className="text-accent">{`]`}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-2 py-1 text-muted-foreground/90">
                    <span className="text-accent">{`time`}</span>
                    <span className="tabular-nums text-foreground/90">{formatTime(now)}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-2 py-1 text-muted-foreground/90">
                    <span className="text-accent">{`v`}</span>
                    <span className="tabular-nums text-foreground/90">{__APP_VERSION__}</span>
                  </span>
                </div>
              </div>
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
            </header>

            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </div>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
