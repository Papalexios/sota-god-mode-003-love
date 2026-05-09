import { useEffect, useState } from "react";
import {
  Zap,
  Sparkles,
  LayoutGrid,
  Shield,
  ArrowRight,
  Bot,
  TrendingUp,
  Star,
  CheckCircle2,
  ChevronRight,
  Search,
  FileText,
  Link2,
  Brain,
  Gauge,
  Globe2,
  Workflow,
  Target,
  Wand2,
  LineChart,
  Image as ImageIcon,
  Quote,
  Rocket,
  Crown,
  Infinity as InfinityIcon,
} from "lucide-react";
import { OptimizerDashboard } from "@/components/optimizer/OptimizerDashboard";
import { useOptimizerStore } from "@/lib/store";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Marketing landing page — premium, explanatory, conversion-focused         */
/* ─────────────────────────────────────────────────────────────────────────── */

const heroStats = [
  { value: "98+", label: "Quality Score", sub: "E-E-A-T validated" },
  { value: "24/7", label: "Autonomous", sub: "God Mode publishing" },
  { value: "6k+", label: "Words / post", sub: "Long-form orchestration" },
  { value: "<2m", label: "Time to draft", sub: "From keyword to article" },
];

const capabilities = [
  {
    icon: Brain,
    badge: "AI Engine",
    title: "Master Content Generation",
    description:
      "Human-first anti-AI engine. Hormozi/Ferriss voice with 20+ first-person pronouns, banned AI phrases, and ruthless self-critique passes until quality scores 92+.",
    points: ["3-pass self-critique", "Outlaw AI clichés", "First-person voice"],
    accent: "from-emerald-500/30 to-teal-500/5",
    iconColor: "text-emerald-400",
  },
  {
    icon: Search,
    badge: "SERP Intelligence",
    title: "Live Gap Analysis",
    description:
      "Scans top-3 SERPs for your keyword, extracts 25+ topics, 20 missing keywords, and competitor headings. Pulls live NeuronWriter terms & entities for >90/100 SEO scores.",
    points: ["Top-3 SERP scan", "Entity extraction", "NeuronWriter sync"],
    accent: "from-violet-500/30 to-fuchsia-500/5",
    iconColor: "text-violet-400",
  },
  {
    icon: Bot,
    badge: "God Mode 2.0",
    title: "Autonomous 24/7 Publishing",
    description:
      "Set it and forget it. The autonomous loop researches, writes, optimizes, and ships full articles to WordPress while you sleep — with priority queues and full HTML history.",
    points: ["Always-on loop", "Priority queues", "Full audit trail"],
    accent: "from-amber-500/30 to-orange-500/5",
    iconColor: "text-amber-400",
  },
  {
    icon: Link2,
    badge: "SEO Surgery",
    title: "IDF-Weighted Internal Linking",
    description:
      "N-gram matcher uses your real sitemap to inject 6-12 contextual internal links per article. No hallucinated URLs — only pages that actually exist on your site.",
    points: ["Sitemap-grounded", "6-12 links/post", "Anchor diversity"],
    accent: "from-sky-500/30 to-blue-500/5",
    iconColor: "text-sky-400",
  },
  {
    icon: ImageIcon,
    badge: "Media Engine",
    title: "WordPress Media + YouTube",
    description:
      "Multi-term scoring picks the best images from your WP library and injects them as native <figure> tags. One curated YouTube embed via Piped/Invidious fallback.",
    points: ["Native figures", "Smart image scoring", "1 video / post"],
    accent: "from-pink-500/30 to-rose-500/5",
    iconColor: "text-pink-400",
  },
  {
    icon: Gauge,
    badge: "Quality Gate",
    title: "E-E-A-T + Schema",
    description:
      "Every post passes the E-E-A-T validator, gets a Gap Coverage Score, structured data (Article, FAQ, HowTo), and 12+ high-authority real references — no LLM-generated links.",
    points: ["E-E-A-T gate", "Real references only", "Schema.org built-in"],
    accent: "from-cyan-500/30 to-emerald-500/5",
    iconColor: "text-cyan-400",
  },
];

const workflowSteps = [
  {
    n: "01",
    icon: Workflow,
    title: "Connect & Configure",
    body: "Plug in WordPress (Application Password), OpenRouter / Groq / OpenAI, NeuronWriter, and your sitemap. Takes under 60 seconds.",
  },
  {
    n: "02",
    icon: Target,
    title: "Pick a Strategy",
    body: "Bulk Planner, Single Article, Quick Refresh, Gap Analysis, or full God Mode autonomous engine — choose the workflow that fits your goal.",
  },
  {
    n: "03",
    icon: Wand2,
    title: "Generate & Optimize",
    body: "The orchestrator runs 10+ phases: SERP scan → outline → draft → media → links → critique → schema → publish-ready HTML.",
  },
  {
    n: "04",
    icon: Rocket,
    title: "Publish to WordPress",
    body: "One-click direct publish via REST API with slug consistency, featured images, categories, and full HTML preserved.",
  },
];

const strategies = [
  {
    icon: FileText,
    name: "Single Article",
    desc: "One keyword → one premium long-form post (2k–6k words).",
  },
  {
    icon: LayoutGrid,
    name: "Bulk Planner",
    desc: "Queue dozens of keywords and ship them in parallel batches.",
  },
  {
    icon: Crown,
    name: "God Mode",
    desc: "Fully autonomous loop. Researches, writes & publishes 24/7.",
  },
  {
    icon: Search,
    name: "Gap Analysis",
    desc: "Find what your competitors rank for — and you don't.",
  },
  {
    icon: Sparkles,
    name: "Quick Refresh",
    desc: "Re-optimize existing posts with fresh SERP data.",
  },
  {
    icon: Globe2,
    name: "Sitemap Sync",
    desc: "Parallel racing crawler with WP REST API priority.",
  },
];

const proofPoints = [
  { icon: CheckCircle2, label: "No LLM-generated reference links — real sources only" },
  { icon: CheckCircle2, label: "SSRF protection + standard HTTP status codes" },
  { icon: CheckCircle2, label: "Self-critique loop until 92+ quality score" },
  { icon: CheckCircle2, label: "Direct WordPress publishing with App Passwords" },
  { icon: CheckCircle2, label: "Long-form orchestration up to 8 retry attempts" },
  { icon: CheckCircle2, label: "Full HTML history & audit trail per article" },
];

const Index = () => {
  const { showOptimizer: storeShowOptimizer, setShowOptimizer, contentItems } = useOptimizerStore();
  const shouldShowOptimizer = storeShowOptimizer || contentItems.length > 0;

  // Live ticker for hero "currently doing"
  const tickerLines = [
    "Scanning top-3 SERP results…",
    "Extracting 25+ topical entities…",
    "Drafting 4,200-word long-form article…",
    "Injecting 9 contextual internal links…",
    "Running 3rd self-critique pass — score 94/100…",
    "Publishing to WordPress…",
  ];
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % tickerLines.length), 2400);
    return () => clearInterval(id);
  }, []);

  if (shouldShowOptimizer) {
    return <OptimizerDashboard />;
  }

  return (
    <div className="min-h-screen gradient-bg selection:bg-primary/30 selection:text-foreground relative overflow-hidden">
      {/* ── Ambient mesh background ─────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-15%] left-[-15%] w-[600px] h-[600px] rounded-full bg-primary/20 blur-[140px] animate-pulse-glow" />
        <div
          className="absolute top-[20%] right-[-25%] w-[500px] h-[500px] rounded-full bg-accent/15 blur-[140px]"
          style={{ animation: "float 9s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-[5%] left-[15%] w-[450px] h-[450px] rounded-full bg-emerald-500/15 blur-[140px]"
          style={{ animation: "float 11s ease-in-out infinite reverse" }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      {/* ── Sticky Header ───────────────────────────────────────────────── */}
      <header className="px-4 md:px-6 py-3 md:py-4 sticky top-0 z-50 backdrop-blur-2xl bg-background/60 border-b border-border/20">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/30 to-emerald-600/10 border border-primary/30 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
            <Zap className="w-5 h-5 text-primary fill-primary/30" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[15px] md:text-xl font-extrabold tracking-tight text-foreground leading-tight truncate">
              WP Optimizer <span className="gradient-text">PRO</span>
            </h1>
            <p className="text-[9px] md:text-xs text-muted-foreground/70 font-bold tracking-[0.15em] uppercase">
              Enterprise SEO Engine
            </p>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            <a href="#capabilities" className="hover:text-foreground transition">Capabilities</a>
            <a href="#workflow" className="hover:text-foreground transition">How it works</a>
            <a href="#strategies" className="hover:text-foreground transition">Strategies</a>
            <a href="#proof" className="hover:text-foreground transition">Why it ranks</a>
          </nav>
          <button
            onClick={() => setShowOptimizer(true)}
            className="flex items-center gap-1.5 px-4 h-9 rounded-full bg-primary text-primary-foreground text-xs md:text-sm font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 active:scale-95 transition"
          >
            Launch
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <main className="relative z-10">
        <section className="px-4 md:px-6 pt-12 md:pt-20 pb-16 md:pb-24">
          <div className="max-w-6xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 backdrop-blur-xl border border-primary/25 text-primary text-[11px] md:text-sm font-semibold mb-6 shadow-lg shadow-primary/10 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span>v3.0 · The Autonomous SEO Engine for WordPress</span>
            </div>

            <h2 className="text-[40px] leading-[1.02] md:text-7xl lg:text-[88px] font-extrabold text-foreground tracking-[-0.045em] mb-4">
              Stop writing posts.
            </h2>
            <h2 className="text-[40px] leading-[1.02] md:text-7xl lg:text-[88px] font-extrabold tracking-[-0.045em] mb-6 md:mb-8">
              <span className="gradient-text">Start ranking them.</span>
            </h2>

            <p className="text-base md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 md:mb-10 leading-relaxed font-light">
              An enterprise-grade engine that researches the SERP, writes a 4,000-word article in your voice,
              injects internal links from your real sitemap, and publishes directly to WordPress —{" "}
              <span className="text-foreground font-medium">while you sleep.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center px-2 sm:px-0 mb-10 md:mb-14">
              <button
                onClick={() => setShowOptimizer(true)}
                className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 md:px-9 h-[58px] md:h-[64px] bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground font-bold text-base md:text-lg rounded-2xl md:rounded-full shadow-[0_15px_50px_-10px_rgba(16,185,129,0.7)] hover:shadow-[0_20px_60px_-10px_rgba(16,185,129,0.9)] active:scale-[0.98] transition-all"
              >
                <Zap className="w-5 h-5 fill-current" />
                Launch the Engine
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition" />
              </button>
              <a
                href="#capabilities"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 md:px-9 h-[58px] md:h-[64px] bg-card/50 backdrop-blur-xl border border-border/40 text-foreground font-semibold text-base md:text-lg rounded-2xl md:rounded-full hover:bg-card/70 hover:border-primary/40 active:scale-[0.98] transition-all"
              >
                <Sparkles className="w-5 h-5 text-accent" />
                See Capabilities
              </a>
            </div>

            {/* Live ticker — what the engine is doing right now */}
            <div className="max-w-2xl mx-auto rounded-2xl bg-card/40 backdrop-blur-xl border border-border/40 px-5 py-4 mb-10 md:mb-14 shadow-2xl">
              <div className="flex items-center gap-3 text-left">
                <div className="relative flex h-2.5 w-2.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                </div>
                <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">Live</div>
                <div className="flex-1 font-mono text-xs md:text-sm text-foreground/90 truncate animate-fade-in" key={tick}>
                  {tickerLines[tick]}
                </div>
              </div>
            </div>

            {/* Hero stat row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto">
              {heroStats.map((s, i) => (
                <div
                  key={s.label}
                  className="rounded-2xl bg-card/40 backdrop-blur-xl border border-border/30 p-4 md:p-5 text-left hover:border-primary/40 transition"
                  style={{ animation: `fade-up 0.5s ${i * 80}ms both` }}
                >
                  <div className="text-2xl md:text-4xl font-extrabold gradient-text leading-none tracking-tight">{s.value}</div>
                  <div className="text-xs md:text-sm font-bold text-foreground mt-2">{s.label}</div>
                  <div className="text-[10px] md:text-xs text-muted-foreground/80 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Trust line */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8 text-xs text-muted-foreground/80">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="font-medium">Trusted by 2,000+ publishers · 1M+ words generated</span>
            </div>
          </div>
        </section>

        {/* ── CAPABILITIES ─────────────────────────────────────────────── */}
        <section id="capabilities" className="px-4 md:px-6 py-16 md:py-28">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14 md:mb-20">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                <Brain className="w-3.5 h-3.5" />
                Capabilities
              </div>
              <h3 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-[-0.035em] text-foreground mb-4">
                Six engines. <span className="gradient-text">One unfair advantage.</span>
              </h3>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Each module is purpose-built. Together, they replace your entire content team.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {capabilities.map((c, idx) => (
                <div
                  key={c.title}
                  className="group relative overflow-hidden rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl p-6 md:p-8 hover:border-primary/40 hover:-translate-y-1 transition-all duration-300"
                  style={{ animation: `fade-up 0.5s ${idx * 70}ms both` }}
                >
                  <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br ${c.accent} blur-3xl opacity-70 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-background/60 border border-border/40 flex items-center justify-center shadow-inner">
                        <c.icon className={`w-5 h-5 ${c.iconColor}`} />
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">
                        {c.badge}
                      </div>
                    </div>
                    <h4 className="text-xl md:text-2xl font-extrabold text-foreground mb-3 tracking-tight leading-tight">
                      {c.title}
                    </h4>
                    <p className="text-sm md:text-[15px] text-muted-foreground leading-relaxed mb-5">
                      {c.description}
                    </p>
                    <ul className="space-y-1.5">
                      {c.points.map((p) => (
                        <li key={p} className="flex items-center gap-2 text-xs md:text-sm text-foreground/80">
                          <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${c.iconColor}`} />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WORKFLOW ─────────────────────────────────────────────────── */}
        <section id="workflow" className="px-4 md:px-6 py-16 md:py-28 relative">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14 md:mb-20">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-wider mb-4">
                <Workflow className="w-3.5 h-3.5" />
                How it works
              </div>
              <h3 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-[-0.035em] text-foreground mb-4">
                From keyword to <span className="gradient-text">published article</span> in 4 moves.
              </h3>
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {/* Connector line on desktop */}
              <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

              {workflowSteps.map((s, idx) => (
                <div
                  key={s.n}
                  className="relative rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl p-6 md:p-7 hover:border-primary/40 transition"
                  style={{ animation: `fade-up 0.5s ${idx * 100}ms both` }}
                >
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/10 border border-primary/30 flex items-center justify-center mb-5 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
                    <s.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="font-mono text-[11px] font-bold tracking-[0.2em] text-primary mb-2">STEP {s.n}</div>
                  <h4 className="text-lg md:text-xl font-bold text-foreground mb-2 tracking-tight">{s.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── STRATEGIES ───────────────────────────────────────────────── */}
        <section id="strategies" className="px-4 md:px-6 py-16 md:py-28">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14 md:mb-20">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
                <Target className="w-3.5 h-3.5" />
                Strategies
              </div>
              <h3 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-[-0.035em] text-foreground mb-4">
                Six battle-tested <span className="gradient-text">workflows</span>.
              </h3>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Whether you need one perfect post or 500 — we've got the lever.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
              {strategies.map((s, idx) => (
                <div
                  key={s.name}
                  className="group rounded-2xl border border-border/40 bg-gradient-to-br from-card/60 to-card/20 backdrop-blur-xl p-5 md:p-6 hover:border-primary/40 hover:bg-card/60 transition"
                  style={{ animation: `fade-up 0.5s ${idx * 60}ms both` }}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition">
                    <s.icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div className="text-sm md:text-base font-bold text-foreground mb-1.5 tracking-tight">{s.name}</div>
                  <div className="text-[12px] md:text-sm text-muted-foreground leading-relaxed">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PROOF / WHY IT RANKS ─────────────────────────────────────── */}
        <section id="proof" className="px-4 md:px-6 py-16 md:py-28">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
                  <Shield className="w-3.5 h-3.5" />
                  Why it ranks
                </div>
                <h3 className="text-3xl md:text-5xl font-extrabold tracking-[-0.035em] text-foreground mb-5 leading-[1.05]">
                  Built like a <span className="gradient-text">Google engineer</span> would build it.
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8">
                  No fake links. No hallucinated citations. No "as an AI" filler. Every article passes the same E-E-A-T,
                  schema, and link-integrity checks Google rewards.
                </p>

                <ul className="space-y-3">
                  {proofPoints.map((p, i) => (
                    <li
                      key={p.label}
                      className="flex items-start gap-3 text-sm md:text-[15px] text-foreground/85"
                      style={{ animation: `fade-up 0.5s ${i * 60}ms both` }}
                    >
                      <div className="w-6 h-6 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <p.icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span>{p.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual: terminal-style "engine" mock */}
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent rounded-3xl blur-2xl" />
                <div className="relative rounded-3xl border border-border/40 bg-card/60 backdrop-blur-xl shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-background/60">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                    <div className="ml-3 font-mono text-[11px] text-muted-foreground tracking-wider">
                      orchestrator.run("best ai seo tools")
                    </div>
                  </div>
                  <div className="p-5 md:p-6 font-mono text-[11px] md:text-xs space-y-2 leading-relaxed">
                    {[
                      ["✓", "Phase 0  · SERP scan (top-3) → 27 entities", "text-emerald-400"],
                      ["✓", "Phase 1  · NeuronWriter terms → 142 keywords", "text-emerald-400"],
                      ["✓", "Phase 2  · Outline → 14 H2/H3 sections", "text-emerald-400"],
                      ["✓", "Phase 3  · Master draft → 4,317 words", "text-emerald-400"],
                      ["✓", "Phase 4  · WP media → 6 native <figure>", "text-emerald-400"],
                      ["✓", "Phase 5  · Internal links → 9 / sitemap", "text-emerald-400"],
                      ["✓", "Phase 7  · Self-critique pass 3 → 94/100", "text-emerald-400"],
                      ["✓", "Phase 8  · Schema (Article + FAQ + HowTo)", "text-emerald-400"],
                      ["→", "Phase 10 · Publishing to WordPress…", "text-primary animate-pulse"],
                    ].map(([sym, line, color], i) => (
                      <div key={i} className="flex gap-3">
                        <span className={`${color} font-bold`}>{sym}</span>
                        <span className="text-foreground/80">{line}</span>
                      </div>
                    ))}
                    <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between">
                      <div className="text-muted-foreground">elapsed</div>
                      <div className="text-primary font-bold">1m 47s</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────────────── */}
        <section className="px-4 md:px-6 py-20 md:py-32">
          <div className="max-w-5xl mx-auto relative">
            <div className="absolute -inset-8 bg-gradient-to-br from-primary/30 via-accent/15 to-transparent rounded-[3rem] blur-3xl opacity-70" />
            <div className="relative rounded-[2rem] md:rounded-[2.5rem] border border-primary/30 bg-gradient-to-br from-card/80 to-card/30 backdrop-blur-2xl p-8 md:p-16 text-center shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs md:text-sm font-bold mb-6">
                  <InfinityIcon className="w-3.5 h-3.5" />
                  No credit card. No sales call. Just rankings.
                </div>
                <h3 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-[-0.04em] text-foreground mb-5 leading-[1.02]">
                  Your competitors are <span className="gradient-text">already shipping.</span>
                </h3>
                <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                  Launch the engine, plug in your keyword, and watch the SERP move. The only question is —
                  who publishes first.
                </p>
                <button
                  onClick={() => setShowOptimizer(true)}
                  className="group inline-flex items-center justify-center gap-3 px-8 md:px-12 h-[64px] md:h-[72px] bg-gradient-to-r from-primary via-emerald-400 to-primary text-primary-foreground font-extrabold text-lg md:text-xl rounded-full shadow-[0_20px_60px_-10px_rgba(16,185,129,0.8)] hover:shadow-[0_25px_80px_-10px_rgba(16,185,129,1)] active:scale-[0.98] transition-all"
                >
                  <Zap className="w-6 h-6 fill-current" />
                  Launch the Engine
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition" />
                </button>
                <p className="text-xs md:text-sm text-muted-foreground/80 mt-6 font-medium">
                  Free to use · Bring your own AI keys · Direct to WordPress
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="px-4 md:px-6 py-10 md:py-14 border-t border-border/20 bg-card/20 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-transparent border border-border/30 rounded-xl flex items-center justify-center backdrop-blur-md">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Engineered by <span className="text-foreground">Alexios Papaioannou</span>
              </p>
              <a href="https://affiliatemarketingforsuccess.com" className="text-xs text-primary hover:text-primary/80 transition-colors hover:underline underline-offset-4">
                affiliatemarketingforsuccess.com
              </a>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-5 text-sm text-muted-foreground font-medium">
            {["Terms", "Privacy", "Support", "Documentation"].map((item) => (
              <a key={item} href="#" className="hover:text-primary transition-all">
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
