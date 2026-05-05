import { useState } from "react";
import { useOptimizerStore } from "@/lib/store";
import { OptimizerNav } from "./OptimizerNav";
import { MobileBottomNav } from "./MobileBottomNav";
import { SetupConfig } from "./steps/SetupConfig";
import { ContentStrategy } from "./steps/ContentStrategy";
import { ReviewExport } from "./steps/ReviewExport";
import { Menu, X, Zap, Settings, BarChart3, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const stepMeta: Record<number, { title: string; sub: string; icon: typeof Settings }> = {
  1: { title: "Setup & Config", sub: "API keys · WordPress", icon: Settings },
  2: { title: "Strategy & Planning", sub: "Content engine", icon: BarChart3 },
  3: { title: "Review & Export", sub: "Publish content", icon: FileText },
};

export function OptimizerDashboard() {
  const { currentStep } = useOptimizerStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const meta = stepMeta[currentStep] ?? stepMeta[1];
  const Icon = meta.icon;

  return (
    <div className="min-h-screen gradient-bg flex relative overflow-hidden">
      <div className="hero-glow" style={{ opacity: 0.2 }} />

      {/* Mobile top header */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 bg-background/70 backdrop-blur-2xl border-b border-border/40">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center text-foreground/80 hover:bg-muted/30 active:scale-95 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-emerald-600/10 border border-primary/30 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-foreground truncate leading-tight">{meta.title}</div>
            <div className="text-[10px] text-muted-foreground/70 truncate uppercase tracking-wider">{meta.sub}</div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 border border-primary/20">
            <Zap className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-bold text-primary">{currentStep}/3</span>
          </div>
        </div>
        {/* progress bar */}
        <div className="h-0.5 bg-border/30">
          <div
            className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>
      </header>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-[280px] transition-transform duration-300 lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <OptimizerNav onNavigate={() => setSidebarOpen(false)} />
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 lg:hidden w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <main className="flex-1 overflow-auto relative z-10 custom-scrollbar w-full">
        <div className="p-4 md:p-6 max-w-7xl mx-auto animate-fade-in pt-[72px] pb-28 lg:pt-6 lg:pb-6">
          {currentStep === 1 && <SetupConfig />}
          {currentStep === 2 && <ContentStrategy />}
          {currentStep === 3 && <ReviewExport />}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
