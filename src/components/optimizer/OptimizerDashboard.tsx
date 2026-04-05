import { useState } from "react";
import { useOptimizerStore } from "@/lib/store";
import { OptimizerNav } from "./OptimizerNav";
import { SetupConfig } from "./steps/SetupConfig";
import { ContentStrategy } from "./steps/ContentStrategy";
import { ReviewExport } from "./steps/ReviewExport";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function OptimizerDashboard() {
  const { currentStep } = useOptimizerStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen gradient-bg flex relative overflow-hidden">
      <div className="hero-glow" style={{ opacity: 0.2 }} />

      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 rounded-xl bg-card/80 backdrop-blur-xl border border-border/50 flex items-center justify-center text-foreground shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
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
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <main className="flex-1 overflow-auto relative z-10 custom-scrollbar w-full">
        <div className="p-4 md:p-6 max-w-7xl mx-auto animate-fade-in pt-16 lg:pt-6">
          {currentStep === 1 && <SetupConfig />}
          {currentStep === 2 && <ContentStrategy />}
          {currentStep === 3 && <ReviewExport />}
        </div>
      </main>
    </div>
  );
}
