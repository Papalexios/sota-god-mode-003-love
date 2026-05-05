import { Zap, Sparkles, LayoutGrid, Shield, ArrowRight, Bot, TrendingUp, Star, CheckCircle2, ChevronRight } from "lucide-react";
import { OptimizerDashboard } from "@/components/optimizer/OptimizerDashboard";
import { useOptimizerStore } from "@/lib/store";

const features = [
  {
    icon: Bot,
    title: "God Mode 2.0",
    description: "Autonomous AI agents that publish 24/7 while you sleep.",
    accent: "from-emerald-500/20 to-teal-500/5",
    iconColor: "text-emerald-400",
  },
  {
    icon: Sparkles,
    title: "Gap Analysis",
    description: "NLP + entity extraction reveals what competitors miss.",
    accent: "from-violet-500/20 to-fuchsia-500/5",
    iconColor: "text-violet-400",
  },
  {
    icon: LayoutGrid,
    title: "Bulk Publishing",
    description: "Generate hundreds of optimized articles in one click.",
    accent: "from-amber-500/20 to-orange-500/5",
    iconColor: "text-amber-400",
  },
  {
    icon: Shield,
    title: "Rank Guardian",
    description: "Real-time monitoring with auto-fixes for ranking drops.",
    accent: "from-sky-500/20 to-blue-500/5",
    iconColor: "text-sky-400",
  },
];

const stats = [
  { value: "1M+", label: "Words Generated" },
  { value: "98%", label: "Quality Score" },
  { value: "24/7", label: "Always On" },
];

const Index = () => {
  const { showOptimizer: storeShowOptimizer, setShowOptimizer, contentItems } = useOptimizerStore();
  const shouldShowOptimizer = storeShowOptimizer || contentItems.length > 0;

  if (shouldShowOptimizer) {
    return <OptimizerDashboard />;
  }

  return (
    <div className="min-h-screen gradient-bg selection:bg-primary/30 selection:text-foreground relative overflow-hidden">
      {/* Animated gradient mesh background — mobile-optimized */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-20%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px] animate-pulse-glow" />
        <div className="absolute top-[30%] right-[-30%] w-[450px] h-[450px] rounded-full bg-accent/15 blur-[120px]" style={{ animation: "float 8s ease-in-out infinite" }} />
        <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] rounded-full bg-emerald-500/15 blur-[120px]" style={{ animation: "float 10s ease-in-out infinite reverse" }} />
      </div>

      {/* Header — sleeker mobile */}
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
          <button
            onClick={() => setShowOptimizer(true)}
            className="md:hidden flex items-center gap-1 px-3 h-9 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-primary/30 active:scale-95 transition"
          >
            Launch
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="px-4 md:px-6 pt-8 pb-32 md:py-32 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 backdrop-blur-xl border border-primary/25 text-primary text-[11px] md:text-sm font-semibold mb-6 md:mb-8 shadow-lg shadow-primary/10 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span>v3.0 · The Ultimate SEO Weapon</span>
          </div>

          {/* Headline — mobile-optimized */}
          <h2 className="text-[34px] leading-[1.05] md:text-6xl lg:text-7xl font-extrabold text-foreground mb-3 md:mb-4 tracking-[-0.04em]">
            Turn Your Content Into
          </h2>
          <h2 className="text-[34px] leading-[1.05] md:text-6xl lg:text-7xl font-extrabold mb-5 md:mb-8 tracking-[-0.04em]">
            <span className="gradient-text">Premium Ranking Assets</span>
          </h2>

          <p className="text-[15px] md:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 md:mb-12 leading-relaxed font-light">
            Autonomous AI agents that analyze, optimize, and dominate Google's algorithm in real-time.
            <span className="text-foreground font-normal block md:inline mt-1 md:mt-0"> Experience the God Mode advantage.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-6 justify-center items-center px-2 sm:px-0 mb-8 md:mb-12">
            <button
              onClick={() => setShowOptimizer(true)}
              className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 md:px-8 h-[56px] md:h-[60px] bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground font-bold text-base md:text-lg rounded-2xl md:rounded-full shadow-[0_10px_40px_-10px_rgba(16,185,129,0.6)] hover:shadow-[0_15px_50px_-10px_rgba(16,185,129,0.8)] active:scale-[0.98] transition-all"
            >
              <Zap className="w-5 h-5 fill-current" />
              Launch God Mode
              <ChevronRight className="w-5 h-5 ml-auto sm:ml-0 group-hover:translate-x-0.5 transition" />
            </button>
            <button className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 md:px-8 h-[56px] md:h-[60px] bg-card/50 backdrop-blur-xl border border-border/40 text-foreground font-semibold text-base md:text-lg rounded-2xl md:rounded-full hover:bg-card/70 hover:border-border/60 active:scale-[0.98] transition-all">
              <Sparkles className="w-5 h-5 text-accent" />
              View Features
            </button>
          </div>

          {/* Trust strip / stats — mobile-friendly */}
          <div className="grid grid-cols-3 gap-2 md:gap-6 max-w-md md:max-w-2xl mx-auto mb-2">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl bg-card/40 backdrop-blur-xl border border-border/30 px-2 py-3 md:px-4 md:py-5"
              >
                <div className="text-xl md:text-3xl font-extrabold gradient-text leading-none tracking-tight">{s.value}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground/70 font-semibold mt-1.5 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Social proof line */}
          <div className="flex items-center justify-center gap-1.5 mt-6 text-xs text-muted-foreground/70">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            ))}
            <span className="ml-1.5 font-medium">Trusted by 2,000+ publishers</span>
          </div>
        </div>

        {/* Feature Cards — premium mobile cards */}
        <div className="max-w-7xl mx-auto mt-14 md:mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {features.map((feature, idx) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl p-5 md:p-7 hover:border-primary/40 active:scale-[0.99] transition-all duration-300"
              style={{ animation: `fade-up 0.5s ${idx * 80}ms both` }}
            >
              <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${feature.accent} blur-2xl opacity-60 group-hover:opacity-100 transition-opacity`} />
              <div className="relative">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-background/60 border border-border/40 flex items-center justify-center mb-4 md:mb-5 shadow-inner">
                  <feature.icon className={`w-5 h-5 md:w-6 md:h-6 ${feature.iconColor}`} />
                </div>
                <h3 className="text-base md:text-xl font-bold text-foreground mb-1.5 md:mb-2 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-[13px] md:text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile-only "How it works" quick strip */}
        <div className="md:hidden max-w-md mx-auto mt-10 rounded-2xl bg-gradient-to-br from-card/60 to-card/20 backdrop-blur-xl border border-border/40 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold tracking-tight">How it works</h3>
          </div>
          <ol className="space-y-3">
            {[
              "Connect WordPress in 30 seconds",
              "Import sitemap & pick targets",
              "Let God Mode publish 24/7",
            ].map((step, i) => (
              <li key={step} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-[11px] font-bold text-primary">
                  {i + 1}
                </div>
                <span className="text-[13px] text-foreground/80 leading-relaxed pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 pt-4 border-t border-border/30 flex items-center gap-2 text-[11px] text-muted-foreground/70">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            No credit card required
          </div>
        </div>
      </main>

      {/* Sticky mobile CTA bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none">
        <button
          onClick={() => setShowOptimizer(true)}
          className="pointer-events-auto w-full inline-flex items-center justify-center gap-2 h-[54px] rounded-2xl bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground font-bold text-base shadow-[0_10px_40px_-8px_rgba(16,185,129,0.7)] active:scale-[0.98] transition"
        >
          <Zap className="w-5 h-5 fill-current" />
          Launch God Mode
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Footer */}
      <footer className="hidden md:block px-6 py-12 border-t border-border/20 bg-card/20 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-transparent border border-border/30 rounded-xl flex items-center justify-center backdrop-blur-md">
              <Zap className="w-8 h-8 text-primary" />
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
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground font-medium">
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
