import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SystemStatusLine } from "@/components/SystemStatusLine";

const YOUTUBE_VIDEO_ID = "qCNhaz6IVp8";
const PROFILE_IMG_SRC = "/profile.JPEG";
const PROFILE_IMG_FALLBACK_SRC = "/placeholder.svg";
const GALLERY_FALLBACK_SRC = "/placeholder.svg";

type GalleryItem = { src: string; alt: string };

const DEFAULT_GALLERY_IMAGES: GalleryItem[] = [
  { src: "/gallery/01.JPEG", alt: "Gallery photo 1" },
  { src: "/gallery/02.JPEG", alt: "Gallery photo 2" },
  { src: "/gallery/03.JPEG", alt: "Gallery photo 3" },
  { src: "/gallery/04.JPEG", alt: "Gallery photo 4" },
  { src: "/gallery/05.JPEG", alt: "Gallery photo 5" },
];

const VISIBLE_GALLERY_COUNT = 5;
const PINNED_GALLERY_FILES = ["foto (1).JPEG", "foto (7).jpg", "foto (9).jpg", "foto (1).PNG", "foto (24).JPEG"] as const;

function pickRandomUniqueIndices(total: number, count: number) {
  const result = new Set<number>();
  const max = Math.min(count, total);
  while (result.size < max) {
    result.add(Math.floor(Math.random() * total));
  }
  return Array.from(result);
}

function buildGalleryItemsFromManifest(files: string[]): GalleryItem[] {
  return files.map((name, i) => ({
    src: `/gallery/${name}`,
    alt: `Gallery photo ${i + 1}`,
  }));
}

function indicesForFiles(items: GalleryItem[], files: readonly string[]) {
  return files
    .map((f) => items.findIndex((it) => it.src === `/gallery/${f}`))
    .filter((idx) => idx >= 0);
}

type CodeParticle = {
  id: string;
  dx: string;
  dy: string;
  text: string;
  variant: "accent" | "muted";
};

const Index = () => {
  const [galleryItems, setGalleryItems] = React.useState<GalleryItem[]>(DEFAULT_GALLERY_IMAGES);
  const [visibleGalleryIndices, setVisibleGalleryIndices] = React.useState<number[]>([0, 1, 2, 3, 4]);
  const [isGalleryOpen, setIsGalleryOpen] = React.useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = React.useState<number>(0);
  const [shuffleParticles, setShuffleParticles] = React.useState<CodeParticle[]>([]);

  const handleProfileImgError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    const img = e.currentTarget;
    if (img.src.endsWith(PROFILE_IMG_FALLBACK_SRC)) return;
    img.src = PROFILE_IMG_FALLBACK_SRC;
  };

  const handleGalleryImgError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    const img = e.currentTarget;
    if (img.src.endsWith(GALLERY_FALLBACK_SRC)) return;

    // Some browsers may fire "error" for aborted/cancelled lazy-loads.
    // Retry once with a cache-busting query param before falling back.
    if (img.dataset.retry !== "1") {
      img.dataset.retry = "1";
      try {
        const url = new URL(img.src);
        url.searchParams.set("retry", String(Date.now()));
        img.src = url.toString();
        return;
      } catch {
        // If URL parsing fails, fall back below.
      }
    }

    img.src = GALLERY_FALLBACK_SRC;
  };

  React.useEffect(() => {
    let cancelled = false;
    async function loadGalleryManifest() {
      try {
        const res = await fetch("/gallery/manifest.json", { cache: "no-store" });
        if (!res.ok) return;
        const files = (await res.json()) as unknown;
        if (!Array.isArray(files) || files.some((x) => typeof x !== "string")) return;

        const items = buildGalleryItemsFromManifest(files as string[]);
        if (!items.length) return;
        if (cancelled) return;
        setGalleryItems(items);
        const pinned = indicesForFiles(items, PINNED_GALLERY_FILES);
        setVisibleGalleryIndices(pinned.length === VISIBLE_GALLERY_COUNT ? pinned : pickRandomUniqueIndices(items.length, VISIBLE_GALLERY_COUNT));
        setActiveGalleryIndex((i) => Math.min(i, Math.max(0, items.length - 1)));
      } catch {
        // fallback to DEFAULT_GALLERY_IMAGES
      }
    }

    void loadGalleryManifest();
    return () => {
      cancelled = true;
    };
  }, []);

  const shuffleVisible = React.useCallback(() => {
    setVisibleGalleryIndices(pickRandomUniqueIndices(galleryItems.length, VISIBLE_GALLERY_COUNT));
  }, [galleryItems.length]);

  const spawnShuffleParticles = React.useCallback(() => {
    const glyphs = ["{}", "[]", "<>", "</>", ";", "=>", "//", "++", "0x", "..."];
    const next: CodeParticle[] = Array.from({ length: 10 }, (_, i) => {
      const dx = `${Math.round((Math.random() * 2 - 1) * 42)}px`;
      const dy = `${-18 - Math.round(Math.random() * 46)}px`;
      return {
        id: `${Date.now()}-${i}-${Math.random().toString(16).slice(2)}`,
        dx,
        dy,
        text: glyphs[Math.floor(Math.random() * glyphs.length)],
        variant: Math.random() > 0.6 ? "muted" : "accent",
      };
    });

    setShuffleParticles(next);
    window.setTimeout(() => setShuffleParticles([]), 800);
  }, []);

  const openGallery = (index: number) => {
    setActiveGalleryIndex(index);
    setIsGalleryOpen(true);
  };

  const activeGalleryItem = galleryItems[activeGalleryIndex];

  const goPrev = React.useCallback(() => {
    setActiveGalleryIndex((i) => (i - 1 + galleryItems.length) % galleryItems.length);
  }, [galleryItems.length]);

  const goNext = React.useCallback(() => {
    setActiveGalleryIndex((i) => (i + 1) % galleryItems.length);
  }, [galleryItems.length]);

  React.useEffect(() => {
    if (!isGalleryOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isGalleryOpen, goPrev, goNext]);
  const youtubeEmbedSrc = `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?rel=0`;
  const visibleItems = visibleGalleryIndices.map((i) => galleryItems[i]).filter(Boolean);
  const introText =
    "moje hobby jsou jako švýcarský nůž.\n" +
    "kdybych se mohl rozdělit na více osobností,\n" +
    "jedna by se věnovala autům a motorkám,\n" +
    "druhá by prozkoumávala technologie a 3D modeling,\n" +
    "a tu třetí bys nenašel, protože leží ve spacáku\n" +
    "někde v lese\n";
  const [typedIntro, setTypedIntro] = React.useState("");
  const [showIntroCaret, setShowIntroCaret] = React.useState(true);
  const [introTypingDurationMs, setIntroTypingDurationMs] = React.useState<number>(0);
  const [skillProgress, setSkillProgress] = React.useState({ video: 0, modeling: 0, coding: 0 });

  React.useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setTypedIntro(introText);
      setShowIntroCaret(false);
      setIntroTypingDurationMs(0);
      return;
    }

    let i = 0;
    setTypedIntro("");
    setShowIntroCaret(true);
    const stepMs = 7;
    setIntroTypingDurationMs(introText.length * stepMs);
    const id = window.setInterval(() => {
      i += 1;
      setTypedIntro(introText.slice(0, i));
      if (i >= introText.length) {
        window.clearInterval(id);
        window.setTimeout(() => setShowIntroCaret(false), 2200);
      }
    }, stepMs);
    return () => window.clearInterval(id);
  }, [introText]);

  // Start the rest roughly halfway through the typing effect (so it doesn't feel like a stall)
  const afterIntroDelayMs = Math.round(introTypingDurationMs * 0.5);

  React.useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setSkillProgress({ video: 30, modeling: 20, coding: 15 });
      return;
    }

    setSkillProgress({ video: 0, modeling: 0, coding: 0 });
    const startAt = Math.max(0, afterIntroDelayMs + 120);
    const id = window.setTimeout(() => setSkillProgress({ video: 30, modeling: 20, coding: 15 }), startAt);
    return () => window.clearTimeout(id);
  }, [afterIntroDelayMs]);

  return (
    <div className="min-h-screen bg-transparent font-mono text-muted-foreground">
      {/* Header / Logo */}
      <header className="flex items-center justify-center pt-24 pb-12 px-6">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
          <img
            src={PROFILE_IMG_SRC}
            alt="Profile"
            onError={handleProfileImgError}
            className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover shadow-lg border-2 border-accent/30"
          />
          <span className="text-foreground text-5xl md:text-7xl font-extrabold tracking-tight text-center md:text-left leading-none">
            <span className="text-accent inline-block align-baseline font-extrabold transform scale-x-110">@</span>
            abnmarty
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 pb-20">
        {/* Intro Section */}
        <section className="py-12 text-center">
          <Tooltip delayDuration={80}>
            <TooltipTrigger asChild>
              <h1
                className="inline-block text-4xl md:text-5xl lg:text-6xl text-foreground leading-tight mb-6 font-extrabold tracking-tight cursor-help"
              >
                <span className="text-accent">{`//`}</span> jack of all{" "}
                <span className="text-accent">trades</span>
              </h1>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="center"
              sideOffset={10}
              className="max-w-[min(520px,calc(100vw-2rem))] font-mono text-xs bg-background/70 backdrop-blur border-border/60 text-muted-foreground shadow-lg"
            >
              <div className="flex items-start gap-2">
                <span className="text-accent/90">{`//`}</span>
                <div className="leading-relaxed">
                  <span>{`master of none, but oftentimes better than `}</span>
                  <span
                    className="code-typing text-accent/90"
                    style={{ ["--w" as any]: "16ch" }}
                  >
                    {`a master of one.`}
                  </span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
          <p
            className="text-lg max-w-xl mx-auto leading-relaxed text-muted-foreground/90"
          >
            <span className={showIntroCaret ? "code-type-block code-caret" : "code-type-block"}>{typedIntro}</span>
          </p>
        </section>

        {/* Gallery */}
        <section className="pb-12 -mx-6 page-reveal" style={{ ["--d" as any]: `${afterIntroDelayMs}ms` }}>
          <div className="max-w-5xl mx-auto px-6">
            <div className="rounded-xl border border-border/50 bg-card/40 shadow-sm">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 shadow-sm">
                  <span className="text-[11px] font-mono tracking-tight text-muted-foreground/90">
                    <span className="text-accent">{`//`}</span>
                    <span className="ml-2">{`takhle nějak to vypadá`}</span>
                  </span>
                  <span className="ml-1 h-4 w-px bg-border/60" />
                  <span className="text-[11px] font-mono tracking-tight text-accent/90">{`gallery`}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    spawnShuffleParticles();
                    shuffleVisible();
                  }}
                  className="relative inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 shadow-sm hover:bg-background/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Shuffle gallery"
                  title="Shuffle"
                >
                  <span className="pointer-events-none absolute inset-0 overflow-visible">
                    {shuffleParticles.map((p) => (
                      <span
                        key={p.id}
                        className={[
                          "code-particle absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-mono",
                          p.variant === "accent" ? "text-accent/90" : "text-muted-foreground/80",
                        ].join(" ")}
                        style={{ ["--dx" as any]: p.dx, ["--dy" as any]: p.dy }}
                      >
                        {p.text}
                      </span>
                    ))}
                  </span>
                  <Shuffle className="h-3.5 w-3.5 text-accent/90" />
                  <span className="text-[11px] font-mono tracking-tight text-muted-foreground/90">
                    <span className="text-accent">{`//`}</span>
                    <span className="ml-2">{`shuffle`}</span>
                  </span>
                </button>
            </div>
            <div className="px-5 pb-5">
              <div className="rounded-lg border border-border/50 bg-background/20 overflow-hidden">
                <div className="grid grid-cols-2 h-[360px] md:h-[440px] min-h-0">
                  {/* Left column: 2 */}
                  <div className="grid grid-rows-2 border-r border-border/50 min-h-0 divide-y divide-border/50">
                    {visibleItems.slice(0, 2).map((img) => {
                      const realIndex = galleryItems.findIndex((g) => g.src === img.src);
                      return (
                        <button
                          key={img.src}
                          type="button"
                          onClick={() => openGallery(realIndex === -1 ? 0 : realIndex)}
                          className="group relative h-full w-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <img
                            src={img.src}
                            alt={img.alt}
                            onError={handleGalleryImgError}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      );
                    })}
                  </div>

                  {/* Right column: 3 */}
                  <div className="grid grid-rows-3 min-h-0 divide-y divide-border/50">
                    {visibleItems.slice(2, 5).map((img) => {
                      const realIndex = galleryItems.findIndex((g) => g.src === img.src);
                      return (
                        <button
                          key={img.src}
                          type="button"
                          onClick={() => openGallery(realIndex === -1 ? 0 : realIndex)}
                          className="group relative h-full w-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <img
                            src={img.src}
                            alt={img.alt}
                            onError={handleGalleryImgError}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>

          <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden">
              <div className="bg-background">
                <div className="relative">
                  <img
                    src={activeGalleryItem?.src ?? GALLERY_FALLBACK_SRC}
                    alt={activeGalleryItem?.alt ?? "Gallery photo"}
                    onError={handleGalleryImgError}
                    className="w-full max-h-[80vh] object-contain bg-background"
                  />

                  <button
                    type="button"
                    onClick={goPrev}
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md border border-border/60 bg-background/60 backdrop-blur px-2 py-2 text-foreground hover:bg-background/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border/60 bg-background/60 backdrop-blur px-2 py-2 text-foreground hover:bg-background/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </section>

        {/* Skills / Progress */}
        <section className="pb-6 -mx-6 page-reveal" style={{ ["--d" as any]: `${afterIntroDelayMs + 90}ms` }}>
          <div className="max-w-5xl mx-auto px-6">
            <Tooltip delayDuration={80}>
              <TooltipTrigger asChild>
                <div className="rounded-xl border border-border/50 bg-card/40 shadow-sm cursor-help">
                  <div className="px-5 pt-5 pb-3 flex items-center justify-start">
                    <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 shadow-sm">
                      <span className="text-[11px] font-mono tracking-tight text-muted-foreground/90">
                        <span className="text-accent">{`//`}</span>
                        <span className="ml-2">{`skills`}</span>
                      </span>
                    </div>
                  </div>

                  <div className="px-5 pb-5 grid gap-5">
                    {[
                      {
                        key: "video",
                        title: "Video",
                        desc: "DaVinci Ressolve, Color grading, editing, sound design ...",
                        value: skillProgress.video,
                        target: 21,
                      },
                      {
                        key: "modeling",
                        title: "3D Modeling",
                        desc: "Fusion 360, parametrické modelování, 3D tisk & prototypování, AI nástroje ...",
                        value: skillProgress.modeling,
                        target: 16,
                      },
                      {
                        key: "coding",
                        title: "Coding",
                        desc: "Visual Studio, GitHub, Cursor, AI nástroje ...",
                        value: skillProgress.coding,
                        target: 13,
                      },
                    ].map((row) => (
                      <div key={row.key} className="grid gap-2">
                        <div className="flex items-baseline justify-between gap-4">
                          <div>
                            <div className="text-foreground font-extrabold tracking-tight">
                              <span className="text-accent">{`//`}</span> {row.title}
                            </div>
                            <div className="text-sm text-muted-foreground/85">{row.desc}</div>
                          </div>
                          <div className="text-xs text-muted-foreground/80 tabular-nums">{String(row.target).padStart(2, "0")}%</div>
                        </div>

                        <div
                          className="h-2.5 w-full rounded-full border border-border/60 bg-background/30 overflow-hidden"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={row.value}
                          aria-label={row.title}
                        >
                          <div
                            className="h-full rounded-full bg-accent/80 transition-[width] duration-700 ease-out"
                            style={{ width: `${row.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                align="start"
                sideOffset={10}
                className="max-w-[min(420px,calc(100vw-2rem))] font-mono text-xs bg-background/70 backdrop-blur border-border/60 text-muted-foreground shadow-lg"
              >
                <div className="flex items-start gap-2">
                  <span className="text-accent/90">{`//`}</span>
                  <div className="leading-relaxed">{`work in progress...`}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </section>

        {/* Divider */}
        <div className="py-10 -mx-6 page-reveal" style={{ ["--d" as any]: `${afterIntroDelayMs + 140}ms` }}>
          <div className="max-w-5xl mx-auto px-6">
            <div className="h-px w-full max-w-md mx-auto bg-border/40" />
          </div>
        </div>

        {/* Video Section */}
        <section className="py-12 -mx-6 page-reveal" style={{ ["--d" as any]: `${afterIntroDelayMs + 260}ms` }}>
          <div className="max-w-5xl mx-auto px-6">
            <h2
              className="text-2xl md:text-3xl text-foreground text-center mb-8 font-extrabold tracking-tight"
            >
              <span className="text-accent">{`//`}</span> poslední vydané video
            </h2>
            <div
              className="relative w-full rounded-xl overflow-hidden shadow-lg bg-card"
              style={{ paddingBottom: "56.25%" }}
            >
              <iframe
                className="absolute inset-0 w-full h-full"
                src={youtubeEmbedSrc}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </section>


      </main>

      <SystemStatusLine revealDelayMs={afterIntroDelayMs + 340} />

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center page-reveal" style={{ ["--d" as any]: `${afterIntroDelayMs + 380}ms` }}>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} abnmarty. Všechna práva vyhrazena.
        </p>
      </footer>
    </div>
  );
};

export default Index;
