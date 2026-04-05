import { Zap, Sparkles, LayoutGrid, Shield } from "lucide-react";
import { OptimizerDashboard } from "@/components/optimizer/OptimizerDashboard";
import { useOptimizerStore } from "@/lib/store";

const features = [
  {
    icon: Zap,
    title: "God Mode 2.0",
    description: "Autonomous content optimization that never sleeps. Set it and forget it while your content climbs the rankings 24/7.",
  },
  {
    icon: Sparkles,
    title: "Gap Analysis",
    description: "State-of-the-art content analysis using NLP, entity extraction, and competitor insights powered by NeuronWriter integration.",
  },
  {
    icon: LayoutGrid,
    title: "Bulk Publishing",
    description: "Generate and publish hundreds of optimized articles with one click. Scale your content empire effortlessly.",
  },
  {
    icon: Shield,
    title: "Rank Guardian",
    description: "Real-time monitoring and automatic fixes for content health. Protect your rankings 24/7 with AI-powered alerts.",
  },
];

const Index = () => {
  // ✅ FIX: Use persisted store instead of ephemeral useState.
  // Previously, showOptimizer was useState(false) which reset on every
  // component re-mount (e.g., after error boundary, hot reload, or navigation).
  // This caused the "eye icon takes me to landing page" bug.
  const { showOptimizer: storeShowOptimizer, setShowOptimizer, contentItems } = useOptimizerStore();

  // Derive: if user has any content items OR has previously entered the optimizer,
  // always show it. This survives page refreshes, error boundaries, and re-mounts.
  const shouldShowOptimizer = storeShowOptimizer || contentItems.length > 0;

  if (shouldShowOptimizer) {
    return <OptimizerDashboard />;
  }

  return (
    <div className="min-h-screen gradient-bg selection:bg-primary/30 selection:text-foreground relative overflow-hidden">
      <div className="hero-glow animate-pulse-glow" />

      {/* Header */}
      <header className="px-4 md:px-6 py-4 sticky top-0 z-50 backdrop-blur-md bg-background/10 border-b border-border/10">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center glass-card shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Zap className="w-5 h-5 md:w-6 md:h-6 text-primary drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
              WP Content Optimizer <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">PRO</span>
            </h1>
            <p className="text-[10px] md:text-xs text-muted-foreground font-medium tracking-wide">
              ENTERPRISE-GRADE SEO AUTOMATION
            </p>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-4 md:px-6 py-12 md:py-32 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full glass-card border-primary/20 text-primary text-xs md:text-sm font-medium mb-6 md:mb-8 animate-float">
            <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span>v3.0 Now Available: The Ultimate SEO Weapon</span>
          </div>

          <h2 className="text-3xl md:text-5xl lg:text-7xl font-extrabold text-foreground mb-3 md:mb-4 tracking-tight leading-tight">
            Turn Your Content Into
          </h2>
          <h2 className="text-3xl md:text-5xl lg:text-7xl font-extrabold mb-6 md:mb-8 tracking-tight leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-accent">
              Premium Ranking Assets
            </span>
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 md:mb-12 leading-relaxed font-light px-2">
            Autonomous AI agents that analyze, optimize, and dominate Google's algorithm in real-time.
            <span className="text-foreground"> Experience the God Mode advantage.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center items-center px-4 sm:px-0">
            <button
              onClick={() => setShowOptimizer(true)}
              className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 md:px-8 py-3.5 md:py-4 bg-primary text-primary-foreground font-bold text-base md:text-lg rounded-full hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] hover:scale-105"
            >
              <Zap className="w-5 h-5 md:w-6 md:h-6 fill-current" />
              Launch God Mode
              <div className="absolute inset-0 rounded-full ring-2 ring-primary-foreground/20 group-hover:ring-primary-foreground/40 transition-all" />
            </button>
            <button className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 md:px-8 py-3.5 md:py-4 bg-muted/30 backdrop-blur-sm border border-border/30 text-foreground font-semibold text-base md:text-lg rounded-full hover:bg-muted/20 transition-all hover:border-border/50">
              <Sparkles className="w-5 h-5 text-accent group-hover:text-accent/80" />
              View Features
            </button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="max-w-7xl mx-auto mt-12 md:mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {features.map((feature, idx) => (
            <div
              key={feature.title}
              className="glass-card rounded-2xl p-5 md:p-8 hover:border-primary/50 transition-all duration-500 group relative overflow-hidden"
              style={{ transitionDelay: `${idx * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="w-11 h-11 md:w-14 md:h-14 bg-gradient-to-br from-secondary to-card border border-border/30 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500">
                <feature.icon className="w-5 h-5 md:w-7 md:h-7 text-primary group-hover:text-emerald-300 transition-colors" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-foreground mb-2 md:mb-3 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed group-hover:text-muted-foreground/80 transition-colors">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-white/5 mt-auto bg-black/20 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-transparent border border-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 font-medium">
                Engineered by <span className="text-white">Alexios Papaioannou</span>
              </p>
              <a href="https://affiliatemarketingforsuccess.com" className="text-xs text-primary hover:text-emerald-300 transition-colors hover:underline underline-offset-4">
                affiliatemarketingforsuccess.com
              </a>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-zinc-500 font-medium">
            {["Terms", "Privacy", "Support", "Documentation"].map((item) => (
              <a
                key={item}
                href="#"
                className="hover:text-primary transition-all hover:scale-105 transform cursor-pointer"
              >
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
