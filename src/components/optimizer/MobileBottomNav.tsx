import { Settings, BarChart3, FileText, Bot, Sparkles } from "lucide-react";
import { useOptimizerStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const tabs = [
  { id: 1, label: "Setup", icon: Settings },
  { id: 2, label: "Strategy", icon: BarChart3 },
  { id: 3, label: "Review", icon: FileText },
];

export function MobileBottomNav() {
  const { currentStep, setCurrentStep, godModeState, contentItems } = useOptimizerStore();
  const completed = contentItems.filter((i) => i.status === "completed").length;
  const isRunning = godModeState.status === "running";

  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)] pointer-events-none"
    >
      {isRunning && (
        <div className="pointer-events-auto mx-4 mb-2 px-3 py-2 rounded-xl bg-emerald-500/15 backdrop-blur-xl border border-emerald-400/30 flex items-center gap-2 text-[11px] font-bold text-emerald-300 shadow-lg shadow-emerald-500/10">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/25 flex items-center justify-center">
            <Bot className="w-3 h-3" />
          </div>
          <span className="status-dot-active w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>God Mode active · {godModeState.queue.length} queued</span>
          <Sparkles className="w-3 h-3 ml-auto opacity-70" />
        </div>
      )}

      <div className="pointer-events-auto mx-3 mb-3 rounded-3xl bg-card/85 backdrop-blur-2xl border border-border/60 shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.6)] ring-1 ring-white/5 overflow-hidden">
        <div className="grid grid-cols-3 relative px-1.5 py-1.5">
          {/* sliding indicator */}
          <div
            className="absolute top-1.5 bottom-1.5 w-1/3 px-1.5 transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.1,1)] pointer-events-none"
            style={{ transform: `translateX(${(currentStep - 1) * 100}%)` }}
          >
            <div className="h-full w-full rounded-2xl bg-gradient-to-br from-primary/25 via-emerald-500/15 to-accent/10 border border-primary/40 shadow-[0_4px_20px_-6px_hsla(160,84%,39%,0.5)] ring-1 ring-white/10" />
          </div>

          {tabs.map((t) => {
            const active = currentStep === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setCurrentStep(t.id)}
                className={cn(
                  "relative z-10 flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-2xl transition-colors duration-300",
                  active ? "text-primary" : "text-muted-foreground/70 hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "w-[18px] h-[18px] transition-all duration-300",
                    active && "scale-110 drop-shadow-[0_0_8px_hsla(160,84%,39%,0.6)]"
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span className={cn("text-[10px] font-bold tracking-wider uppercase", active && "text-primary")}>
                  {t.label}
                </span>
                {t.id === 3 && completed > 0 && (
                  <span className="absolute top-1 right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-br from-primary to-emerald-600 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-card shadow-md shadow-primary/30">
                    {completed > 99 ? "99+" : completed}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
