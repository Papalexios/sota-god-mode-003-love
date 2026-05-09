import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Zap,
  Sparkles,
  Shield,
  ArrowRight,
  Bot,
  CheckCircle2,
  Search,
  FileText,
  Link2,
  Brain,
  Gauge,
  Globe2,
  Target,
  Wand2,
  Image as ImageIcon,
  Rocket,
  Crown,
  PlayCircle,
  Layers,
  TrendingUp,
  Workflow,
  Quote,
  Star,
  ChevronDown,
  Cpu,
  Network,
  ScanLine,
  ShieldCheck,
  Sigma,
  Send,
} from "lucide-react";
import { OptimizerDashboard } from "@/components/optimizer/OptimizerDashboard";
import { useOptimizerStore } from "@/lib/store";

/* ───────────────────────────────────────────────────────────────────────────
 *  WP CONTENT OPTIMIZER PRO — Landing v5.0
 *  Aurora ambient · Spotlight cards · Pipeline viz · Conic quality ring
 *  Aesthetic: dark editorial × Linear/Vercel polish × SOTA terminal energy
 * ─────────────────────────────────────────────────────────────────────────── */

// ── Animated count-up ───────────────────────────────────────────────────────
function useCountUp(target: number, durationMs = 1400, start = false): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, start]);
  return val;
}

// ── Spotlight cursor-tracking wrapper ──────────────────────────────────────
function useSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
  }, []);
  return { ref, onMove };
}


/* ───────────────────────────────────────────────────────────────────────────
 *  WP CONTENT OPTIMIZER PRO — Landing v4.0
 *  Premium, conversion-focused, mobile-perfect.
 *  Aesthetic: dark editorial × Linear/Vercel polish × SOTA terminal energy.
 * ─────────────────────────────────────────────────────────────────────────── */

// ── Live engine ticker (hero terminal)
const TERMINAL_LINES: { tag: string; text: string; tone: "info" | "ok" | "warn" | "ship" }[] = [
  { tag: "PHASE 0", text: "Scanning top-3 SERP for 'enterprise content automation'…", tone: "info" },
  { tag: "PHASE 1", text: "NeuronWriter: 142 terms, 38 entities, 26 H2 patterns synced.", tone: "ok" },
  { tag: "PHASE 2", text: "Outline locked → 12 sections, 4,800-word target.", tone: "info" },
  { tag: "PHASE 3", text: "Drafting long-form (4,200 / 4,800 words)…", tone: "info" },
  { tag: "PHASE 4", text: "WordPress media: 6 figures injected, 1 YouTube embed selected.", tone: "ok" },
  { tag: "PHASE 5", text: "IDF link engine: 9 internal links from sitemap, anchor diversity 0.87.", tone: "ok" },
  { tag: "PHASE 7", text: "Self-critique pass 2 of 3 → score 91 → 94 ✓", tone: "warn" },
  { tag: "PHASE 8", text: "E-E-A-T gate: Experience ✓ Expertise ✓ Authority ✓ Trust ✓", tone: "ok" },
  { tag: "PHASE 9", text: "Schema injected (Article + FAQ + HowTo). Gap coverage 96%.", tone: "ok" },
  { tag: "SHIP", text: "Published to WordPress · 4,812 words · 98/100 quality · 23s.", tone: "ship" },
];

const TONE: Record<string, string> = {
  info: "text-sky-300/90",
  ok: "text-emerald-300",
  warn: "text-amber-300",
  ship: "text-fuchsia-300",
};

const HERO_METRICS = [
  { v: "98", suf: "/100", label: "Quality score", sub: "E-E-A-T validated" },
  { v: "4.8k", suf: "w", label: "Avg article", sub: "Long-form orchestration" },
  { v: "10", suf: "+", label: "Engine phases", sub: "Per generation" },
  { v: "24/7", suf: "", label: "Autonomous", sub: "God Mode publishing" },
];

const CAPABILITIES = [
  {
    icon: Brain,
    badge: "AI Engine",
    title: "Master content generation",
    body: "Hormozi/Ferriss voice, banned AI clichés, ruthless self-critique loop until quality scores 92+.",
    bullets: ["3-pass critique", "First-person voice", "Anti-fluff filter"],
  },
  {
    icon: Search,
    badge: "SERP Intelligence",
    title: "Live competitive scan",
    body: "Top-3 SERP analysis with 25+ topical entities, 20 missing keywords, and competitor heading patterns.",
    bullets: ["Top-3 SERP", "Entity graph", "Heading mining"],
  },
  {
    icon: Gauge,
    badge: "NeuronWriter",
    title: "Score >90/100, every time",
    body: "Pulls live NeuronWriter terms, entities, and H2/H3 suggestions, then weaves them into copy naturally.",
    bullets: ["142+ terms / post", "Auto-balance frequency", "Caching + retries"],
  },
  {
    icon: Link2,
    badge: "Internal Links",
    title: "IDF-weighted linker",
    body: "N-gram matcher uses your real sitemap to inject 6–12 contextual internal links. No hallucinated URLs.",
    bullets: ["Sitemap-grounded", "6–12 links / post", "Anchor diversity"],
  },
  {
    icon: ImageIcon,
    badge: "Media Engine",
    title: "WordPress media + YouTube",
    body: "Multi-term scoring picks the best images from your WP library. One curated YouTube embed.",
    bullets: ["Native <figure>", "Smart scoring", "Piped/Invidious"],
  },
  {
    icon: Bot,
    badge: "God Mode 2.0",
    title: "Autonomous 24/7 publishing",
    body: "Fully autonomous loop. Researches, writes, optimizes, and ships — with priority queues and audit trail.",
    bullets: ["Always-on", "Priority queues", "Full HTML history"],
  },
];

const HOW = [
  {
    n: "01",
    icon: Workflow,
    title: "Connect",
    body: "WordPress (App Password), OpenRouter / Groq / OpenAI, NeuronWriter, sitemap. ~60 seconds.",
  },
  {
    n: "02",
    icon: Target,
    title: "Pick a strategy",
    body: "Single Article, Bulk Planner, Quick Refresh, Gap Analysis, or full God Mode autonomous engine.",
  },
  {
    n: "03",
    icon: Wand2,
    title: "Generate",
    body: "10-phase pipeline: SERP → outline → draft → media → links → critique → schema → publish-ready HTML.",
  },
  {
    n: "04",
    icon: Rocket,
    title: "Publish",
    body: "One-click direct publish via REST API with slug consistency, featured images, and full HTML preserved.",
  },
];

const STRATEGIES = [
  { icon: FileText, name: "Single Article", desc: "One keyword → one premium long-form post (2k–6k words)." },
  { icon: Layers, name: "Bulk Planner", desc: "Queue dozens of keywords. Ship them in parallel batches." },
  { icon: Crown, name: "God Mode", desc: "Fully autonomous loop. Researches, writes, publishes 24/7." },
  { icon: Search, name: "Gap Analysis", desc: "What competitors rank for that you don't — surfaced and prioritized." },
  { icon: Sparkles, name: "Quick Refresh", desc: "Re-optimize existing posts with fresh SERP data." },
  { icon: Globe2, name: "Sitemap Sync", desc: "Parallel racing crawler with WP REST API priority." },
];

const PROOFS = [
  "No LLM-generated reference links — real sources only",
  "Self-critique loop until 92+ quality score",
  "SSRF protection + standard HTTP status codes",
  "Direct WordPress publishing with App Passwords",
  "Long-form orchestration up to 8 retry attempts",
  "Full HTML history & audit trail per article",
  "GEO + AEO optimized for AI search visibility",
  "Schema.org Article + FAQ + HowTo built-in",
];

const FAQS = [
  {
    q: "How is this different from generic AI writers?",
    a: "Generic AI writers paste a prompt to an LLM and ship. We run a 10-phase pipeline: SERP scan, NeuronWriter sync, IDF-weighted linking, WordPress media injection, 3-pass self-critique, E-E-A-T gate, and schema. The result is a publishable article — not a draft you have to babysit.",
  },
  {
    q: "Will the content actually rank?",
    a: "Quality scores 92+ on every post, 6–12 contextual internal links from your real sitemap, NeuronWriter scores >90/100, structured data, and a strict E-E-A-T validator. Plus GEO/AEO patterns so LLMs can cite it. The system is built for ranking, not for vanity word counts.",
  },
  {
    q: "Do I need to bring my own API keys?",
    a: "Yes. You plug in your own OpenRouter / Groq / OpenAI / Anthropic key and (optionally) NeuronWriter. This keeps you in control of cost and model choice — and your content never sits on someone else's account.",
  },
  {
    q: "Can it really publish autonomously?",
    a: "Yes. God Mode 2.0 is a 24/7 autonomous loop with priority queues and a full HTML history. You give it a topic queue and a WordPress connection — it researches, writes, optimizes, and ships while you sleep.",
  },
];

const Index = () => {
  const { showOptimizer: storeShowOptimizer, setShowOptimizer, contentItems } = useOptimizerStore();
  const shouldShowOptimizer = storeShowOptimizer || contentItems.length > 0;

  // Terminal — append one line at a time, then loop
  const [tickIdx, setTickIdx] = useState(2);
  useEffect(() => {
    const id = setInterval(() => setTickIdx((i) => (i + 1) % TERMINAL_LINES.length), 1700);
    return () => clearInterval(id);
  }, []);
  const visible = useMemo(() => {
    const arr: typeof TERMINAL_LINES = [];
    for (let k = 5; k >= 0; k--) {
      arr.push(TERMINAL_LINES[(tickIdx - k + TERMINAL_LINES.length) % TERMINAL_LINES.length]);
    }
    return arr;
  }, [tickIdx]);

  // FAQ open state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Reveal-on-scroll
  const revealRefs = useRef<HTMLElement[]>([]);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    revealRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);
  const reg = (el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el);
  };

  if (shouldShowOptimizer) return <OptimizerDashboard />;

  const launch = () => setShowOptimizer(true);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-foreground relative overflow-x-clip">
      {/* Local styles */}
      <style>{`
        .reveal { opacity: 0; transform: translateY(18px); transition: opacity .7s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1); }
        .reveal.is-visible { opacity: 1; transform: none; }
        .grid-mask { mask-image: radial-gradient(ellipse at center, #000 40%, transparent 75%); -webkit-mask-image: radial-gradient(ellipse at center, #000 40%, transparent 75%); }
        .text-balance { text-wrap: balance; }
        .text-pretty { text-wrap: pretty; }
        @keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        .caret { display:inline-block; width:.55ch; height:1em; background:hsl(var(--primary)); vertical-align:-2px; margin-left:2px; animation: blink 1.05s steps(1) infinite; border-radius:1px; }
        @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .marquee-track { animation: marquee 38s linear infinite; }
      `}</style>

      {/* ── Ambient aurora ─────────────────────────────────────────────────── */}
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-noise">
        <div className="aurora-layer w-[820px] h-[820px] -top-56 -left-56 bg-primary/30" />
        <div className="aurora-layer w-[680px] h-[680px] top-[12%] -right-48 bg-accent/25" style={{ animationDelay: "-7s" }} />
        <div className="aurora-layer w-[640px] h-[640px] bottom-[-12%] left-[8%] bg-emerald-500/25" style={{ animationDelay: "-14s" }} />
        <div className="aurora-layer w-[520px] h-[520px] top-[55%] left-[55%] bg-sky-500/15" style={{ animationDelay: "-3s" }} />
        <div
          className="absolute inset-0 opacity-[0.05] grid-mask"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>


      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-background/55 border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 md:h-16 flex items-center gap-3">
          <a href="#top" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/30 to-emerald-700/15 border border-primary/30 shadow-[0_0_24px_-6px_hsla(160,84%,39%,0.6)]">
              <Zap className="w-[18px] h-[18px] text-primary fill-primary/40" />
            </div>
            <div className="leading-none">
              <div className="text-[15px] md:text-[16px] font-extrabold tracking-tight">
                WP Optimizer <span className="gradient-text">PRO</span>
              </div>
              <div className="text-[9px] md:text-[10px] text-muted-foreground/70 font-bold tracking-[0.18em] uppercase mt-0.5">
                Enterprise SEO Engine
              </div>
            </div>
          </a>

          <nav className="hidden lg:flex items-center gap-7 mx-auto text-sm font-medium text-muted-foreground">
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <a href="#capabilities" className="hover:text-foreground transition">Capabilities</a>
            <a href="#strategies" className="hover:text-foreground transition">Strategies</a>
            <a href="#proof" className="hover:text-foreground transition">Why it ranks</a>
            <a href="#faq" className="hover:text-foreground transition">FAQ</a>
            <a href="/status" className="hover:text-foreground transition">Status</a>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={launch}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full text-[13px] font-semibold text-foreground/80 hover:text-foreground hover:bg-muted/40 transition"
            >
              Sign in
            </button>
            <button
              onClick={launch}
              className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-primary text-primary-foreground text-[13px] font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 active:scale-[.97] transition"
            >
              Launch app
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section id="top" className="relative px-4 md:px-8 pt-12 md:pt-20 pb-14 md:pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center reveal" ref={reg}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/70 backdrop-blur-xl border border-primary/25 text-primary text-[11px] md:text-xs font-semibold mb-6 shadow-lg shadow-primary/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Live engine · 10-phase pipeline · 92+ quality
            </div>

            <h1 className="text-balance text-[40px] leading-[1.04] sm:text-[56px] sm:leading-[1.02] md:text-[80px] md:leading-[0.98] lg:text-[96px] lg:leading-[0.96] font-black tracking-[-0.04em]">
              Ship articles that
              <br className="hidden sm:block" />{" "}
              <span className="gradient-text">actually rank.</span>
            </h1>

            <p className="mt-6 md:mt-8 text-pretty text-base md:text-xl text-muted-foreground/95 max-w-2xl mx-auto leading-relaxed">
              An enterprise SEO engine that scans the SERP, syncs NeuronWriter, writes 4k+ words in your voice,
              wires real internal links, validates E-E-A-T, and publishes to WordPress —{" "}
              <span className="text-foreground font-semibold">end to end, in minutes</span>.
            </p>

            <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={launch}
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 h-12 rounded-full bg-primary text-primary-foreground text-sm md:text-base font-bold shadow-[0_8px_30px_-6px_hsla(160,84%,39%,0.6)] hover:shadow-[0_12px_40px_-6px_hsla(160,84%,39%,0.85)] active:scale-[.98] transition-all"
              >
                Start optimizing free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
              </button>
              <a
                href="#how"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 h-12 rounded-full bg-card/70 border border-border/60 text-sm md:text-base font-semibold text-foreground/90 hover:bg-card transition"
              >
                <PlayCircle className="w-4 h-4 text-primary" />
                See how it works
              </a>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] md:text-xs text-muted-foreground/80">
              <Shield className="w-3.5 h-3.5 text-primary" />
              No credit card · Bring your own AI keys · Your data stays yours
            </div>
          </div>

          {/* Hero terminal */}
          <div className="mt-12 md:mt-16 reveal" ref={reg}>
            <div className="relative rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 h-10 border-b border-border/50 bg-muted/30">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-[11px] font-mono text-muted-foreground/80 truncate">
                  orchestrator › single-article · enterprise-content-automation
                </span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-emerald-300 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  RUNNING
                </span>
              </div>

              <div className="p-4 md:p-6 font-mono text-[12px] md:text-[13px] leading-relaxed">
                {visible.map((l, i) => (
                  <div
                    key={`${tickIdx}-${i}`}
                    className={`flex items-start gap-3 ${i === visible.length - 1 ? "opacity-100" : "opacity-60"}`}
                    style={{ animation: i === visible.length - 1 ? "fade-up .4s ease both" : undefined }}
                  >
                    <span className="text-muted-foreground/60 select-none w-16 shrink-0">{l.tag}</span>
                    <span className={`flex-1 ${TONE[l.tone]}`}>{l.text}</span>
                  </div>
                ))}
                <div className="flex items-start gap-3 pt-1">
                  <span className="text-muted-foreground/60 select-none w-16 shrink-0">›</span>
                  <span className="text-foreground/80">awaiting next phase<span className="caret" /></span>
                </div>
              </div>
            </div>

            {/* Hero metrics */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {HERO_METRICS.map((m) => (
                <div
                  key={m.label}
                  className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl px-4 py-4 md:px-5 md:py-5"
                >
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-2xl md:text-4xl font-black tracking-tight text-foreground">{m.v}</span>
                    <span className="text-base md:text-xl font-bold text-primary">{m.suf}</span>
                  </div>
                  <div className="mt-1 text-[12px] md:text-sm font-semibold text-foreground/90">{m.label}</div>
                  <div className="text-[10px] md:text-xs text-muted-foreground/80">{m.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Logo / Tech marquee ───────────────────────────────────────────── */}
      <section className="relative py-6 md:py-8 border-y border-border/30 bg-card/30 overflow-hidden">
        <div className="text-center text-[10px] md:text-[11px] font-bold tracking-[0.22em] uppercase text-muted-foreground/70 mb-3">
          Plays nicely with the stack you already use
        </div>
        <div className="relative">
          <div className="flex marquee-track gap-10 whitespace-nowrap">
            {[
              "WordPress", "NeuronWriter", "OpenRouter", "OpenAI", "Anthropic", "Google Gemini",
              "Groq", "Cloudflare Pages", "Supabase", "Schema.org", "WP REST API", "Sitemap.xml",
              "WordPress", "NeuronWriter", "OpenRouter", "OpenAI", "Anthropic", "Google Gemini",
              "Groq", "Cloudflare Pages", "Supabase", "Schema.org", "WP REST API", "Sitemap.xml",
            ].map((n, i) => (
              <span key={i} className="text-[13px] md:text-[15px] font-semibold text-foreground/55 tracking-tight">
                {n}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how" className="relative px-4 md:px-8 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="text-center reveal" ref={reg}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-[11px] font-bold tracking-[0.15em] uppercase">
              How it works
            </div>
            <h2 className="mt-4 text-3xl md:text-5xl font-black tracking-tight text-balance">
              From keyword to published in <span className="gradient-text">four steps</span>.
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-muted-foreground text-base md:text-lg">
              No babysitting. No prompt-stuffing. Connect once, then run any of six battle-tested workflows.
            </p>
          </div>

          <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {HOW.map((s) => (
              <div
                key={s.n}
                ref={reg}
                className="reveal group relative rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-5 md:p-6 hover:border-primary/40 hover:bg-card/80 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-primary/80 tracking-widest">{s.n}</span>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/25 to-emerald-700/10 border border-primary/25 flex items-center justify-center">
                    <s.icon className="w-[18px] h-[18px] text-primary" />
                  </div>
                </div>
                <h3 className="mt-4 text-lg md:text-xl font-bold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CAPABILITIES ──────────────────────────────────────────────────── */}
      <section id="capabilities" className="relative px-4 md:px-8 py-20 md:py-28 border-t border-border/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center reveal" ref={reg}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/25 text-accent-foreground/90 text-[11px] font-bold tracking-[0.15em] uppercase">
              <Sparkles className="w-3 h-3 text-accent" />
              Capabilities
            </div>
            <h2 className="mt-4 text-3xl md:text-5xl font-black tracking-tight text-balance">
              An entire SEO team, <span className="gradient-text">orchestrated for you.</span>
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-muted-foreground text-base md:text-lg">
              Six engines work in lock-step on every article. You give it a keyword. It does the rest.
            </p>
          </div>

          <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {CAPABILITIES.map((c) => (
              <div
                key={c.title}
                ref={reg}
                className="reveal group relative rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 hover:border-primary/40 hover:bg-card/80 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/25 to-accent/15 border border-primary/25 flex items-center justify-center">
                    <c.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground/80">
                    {c.badge}
                  </span>
                </div>
                <h3 className="mt-4 text-lg md:text-xl font-bold tracking-tight">{c.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.body}</p>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {c.bullets.map((b) => (
                    <li
                      key={b}
                      className="px-2 py-1 rounded-md bg-muted/40 border border-border/40 text-[10px] font-mono font-semibold text-foreground/80"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STRATEGIES ────────────────────────────────────────────────────── */}
      <section id="strategies" className="relative px-4 md:px-8 py-20 md:py-28 border-t border-border/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center reveal" ref={reg}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] font-bold tracking-[0.15em] uppercase">
              Strategies
            </div>
            <h2 className="mt-4 text-3xl md:text-5xl font-black tracking-tight text-balance">
              Six workflows. <span className="gradient-text">One engine.</span>
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-muted-foreground text-base md:text-lg">
              From a single article to fully autonomous publishing — pick the lane that fits your goal today.
            </p>
          </div>

          <div className="mt-12 md:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {STRATEGIES.map((s) => (
              <button
                key={s.name}
                ref={reg as any}
                onClick={launch}
                className="reveal text-left group relative rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-5 md:p-6 hover:border-primary/40 hover:bg-card/80 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                    <s.icon className="w-[18px] h-[18px] text-primary" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
                </div>
                <h3 className="mt-4 text-base md:text-lg font-bold tracking-tight">{s.name}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY IT RANKS ──────────────────────────────────────────────────── */}
      <section id="proof" className="relative px-4 md:px-8 py-20 md:py-28 border-t border-border/30">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="reveal" ref={reg}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-[11px] font-bold tracking-[0.15em] uppercase">
              Why it ranks
            </div>
            <h2 className="mt-4 text-3xl md:text-5xl font-black tracking-tight text-balance">
              Optimized for <span className="gradient-text">SEO, GEO, and AEO</span>.
            </h2>
            <p className="mt-4 text-muted-foreground text-base md:text-lg leading-relaxed">
              Every article is engineered to rank in Google, get cited by ChatGPT and Perplexity, and answer
              voice queries. Not because we promised it — because the pipeline enforces it.
            </p>

            <ul className="mt-8 space-y-3">
              {PROOFS.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm md:text-base text-foreground/90">{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="reveal" ref={reg}>
            <div className="relative rounded-3xl border border-border/60 bg-card/70 backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-black/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-primary" />
                  <span className="text-sm font-bold tracking-tight">Quality dashboard</span>
                </div>
                <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-300">LIVE</span>
              </div>

              {/* Score ring */}
              <div className="mt-6 grid grid-cols-2 gap-6 items-center">
                <div className="relative aspect-square max-w-[180px] mx-auto">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="52" stroke="hsl(var(--muted))" strokeWidth="10" fill="none" opacity=".3" />
                    <circle
                      cx="60" cy="60" r="52"
                      stroke="hsl(var(--primary))"
                      strokeWidth="10"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 52}
                      strokeDashoffset={(2 * Math.PI * 52) * (1 - 0.96)}
                      style={{ filter: "drop-shadow(0 0 14px hsla(160,84%,39%,.55))" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-4xl md:text-5xl font-black tabular-nums">96</div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Quality</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: "E-E-A-T", v: 97, color: "bg-emerald-400" },
                    { label: "NeuronWriter", v: 93, color: "bg-sky-400" },
                    { label: "Gap coverage", v: 96, color: "bg-violet-400" },
                    { label: "AI visibility", v: 91, color: "bg-amber-400" },
                  ].map((r) => (
                    <div key={r.label}>
                      <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                        <span className="text-foreground/80">{r.label}</span>
                        <span className="font-mono tabular-nums text-foreground">{r.v}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <div className={`h-full ${r.color} rounded-full`} style={{ width: `${r.v}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                {[
                  { k: "Words", v: "4,812" },
                  { k: "Internal links", v: "9" },
                  { k: "Schema", v: "3 types" },
                ].map((s) => (
                  <div key={s.k} className="rounded-xl bg-muted/30 border border-border/40 py-2.5">
                    <div className="text-sm font-black tabular-nums">{s.v}</div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80 mt-0.5">{s.k}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PULL QUOTE ────────────────────────────────────────────────────── */}
      <section className="relative px-4 md:px-8 py-16 md:py-20 border-t border-border/30">
        <div className="max-w-4xl mx-auto text-center reveal" ref={reg}>
          <Quote className="w-8 h-8 text-primary/70 mx-auto" />
          <p className="mt-5 text-balance text-2xl md:text-4xl font-bold tracking-tight leading-snug text-foreground/95">
            "It's the difference between an AI that writes —{" "}
            <span className="gradient-text">and an AI that actually publishes content that ranks.</span>"
          </p>
          <div className="mt-6 flex items-center justify-center gap-1 text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-current" />
            ))}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">SEO operators using WP Optimizer PRO in production</div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section id="faq" className="relative px-4 md:px-8 py-20 md:py-28 border-t border-border/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center reveal" ref={reg}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-[11px] font-bold tracking-[0.15em] uppercase">
              FAQ
            </div>
            <h2 className="mt-4 text-3xl md:text-5xl font-black tracking-tight text-balance">
              Questions, <span className="gradient-text">answered.</span>
            </h2>
          </div>

          <div className="mt-10 space-y-3">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={f.q}
                  ref={reg}
                  className="reveal rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center gap-4 px-5 md:px-6 py-4 md:py-5 text-left"
                    aria-expanded={open}
                  >
                    <span className="text-base md:text-lg font-bold tracking-tight flex-1">{f.q}</span>
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${open ? "rotate-180 text-primary" : ""}`} />
                  </button>
                  <div
                    className="grid transition-all duration-300 ease-out"
                    style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 md:px-6 pb-5 md:pb-6 text-sm md:text-base text-muted-foreground leading-relaxed">
                        {f.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="relative px-4 md:px-8 py-20 md:py-28">
        <div className="max-w-5xl mx-auto reveal" ref={reg}>
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card/80 to-accent/10 backdrop-blur-2xl p-8 md:p-14 text-center shadow-[0_30px_80px_-20px_hsla(160,84%,39%,0.4)]">
            <div className="absolute inset-0 -z-10 opacity-30 grid-mask"
                 style={{
                   backgroundImage:
                     "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
                   backgroundSize: "48px 48px",
                 }}
            />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/50 border border-primary/30 text-primary text-[11px] font-bold tracking-[0.15em] uppercase">
              <TrendingUp className="w-3 h-3" />
              Ready when you are
            </div>
            <h2 className="mt-5 text-3xl md:text-6xl font-black tracking-tight text-balance">
              Stop writing drafts. <br className="hidden md:block" />
              <span className="gradient-text">Start shipping rankings.</span>
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-muted-foreground text-base md:text-lg">
              60 seconds to connect. One click to launch a 10-phase pipeline that does the work an SEO team would.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={launch}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 h-12 md:h-14 rounded-full bg-primary text-primary-foreground text-sm md:text-base font-bold shadow-[0_10px_40px_-8px_hsla(160,84%,39%,0.7)] hover:shadow-[0_14px_50px_-8px_hsla(160,84%,39%,0.9)] active:scale-[.98] transition-all"
              >
                Launch the engine
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#capabilities"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 h-12 md:h-14 rounded-full border border-border/60 bg-card/60 text-sm md:text-base font-semibold text-foreground/90 hover:bg-card transition"
              >
                Explore capabilities
              </a>
            </div>
            <div className="mt-5 text-[11px] md:text-xs text-muted-foreground/80">
              No credit card · Bring your own keys · Cancel anything, anytime
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="px-4 md:px-8 py-10 border-t border-border/30 bg-card/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/30 to-emerald-700/15 border border-primary/30 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary fill-primary/40" />
            </div>
            <span className="text-sm font-bold tracking-tight">
              WP Optimizer <span className="gradient-text">PRO</span>
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground/80">
            © {new Date().getFullYear()} · Enterprise SEO Engine · Built for operators
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
