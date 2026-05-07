import { Settings, BarChart3, FileText, Check, Zap, Bot, Sparkles, ChevronRight } from "lucide-react";
import { useOptimizerStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, label: "Setup & Config", sublabel: "API keys · WordPress", icon: Settings },
  { id: 2, label: "Strategy & Planning", sublabel: "Content engine", icon: BarChart3 },
  { id: 3, label: "Review & Export", sublabel: "Publish content", icon: FileText },
];

export function OptimizerNav({ onNavigate }: { onNavigate?: () => void } = {}) {
  const { currentStep, setCurrentStep, contentItems, godModeState } = useOptimizerStore();

  const totalItems = contentItems.length;
  const completedItems = contentItems.filter((i) => i.status === "completed").length;
  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const isGodModeRunning = godModeState.status === "running";
  const isGodModePaused = godModeState.status === "paused";

  return (
    <aside className="w-[280px] h-full bg-card/40 backdrop-blur-2xl border-r border-border/40 flex flex-col z-20 relative overflow-hidden">
      {/* ambient glow */}
      <div
        className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(closest-side, hsla(160,84%,39%,0.18), transparent)" }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(closest-side, hsla(262,83%,58%,0.15), transparent)" }}
      />

      {/* Logo */}
      <div className="relative p-5 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 via-primary to-teal-700 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 ring-1 ring-white/10">
              <Zap className="w-5 h-5 text-white drop-shadow" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-card status-dot-active" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-foreground text-base tracking-tight block leading-tight">
              SOTA Engine
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Sparkles className="w-2.5 h-2.5 text-primary" />
              <span className="text-[10px] text-primary font-bold tracking-[0.18em] uppercase">
                v14 · God Mode
              </span>
            </div>
          </div>
        </div>

        {/* Progress micro-bar */}
        {totalItems > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                Pipeline
              </span>
              <span className="text-[10px] font-mono font-bold text-primary">{progressPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary via-emerald-400 to-teal-300 transition-all duration-700 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Nav Steps */}
      <nav className="relative flex-1 p-3 space-y-1.5 overflow-y-auto custom-scrollbar">
        <div className="px-2 pt-1 pb-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-bold">
            Workflow
          </span>
        </div>

        {steps.map((step, idx) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <button
              key={step.id}
              onClick={() => {
                setCurrentStep(step.id);
                onNavigate?.();
              }}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all duration-300 group relative overflow-hidden",
                isActive
                  ? "bg-gradient-to-r from-primary/12 via-primary/5 to-transparent border border-primary/30 shadow-[0_4px_20px_-8px_hsla(160,84%,39%,0.4)]"
                  : "border border-transparent hover:bg-muted/20 hover:border-border/40"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-gradient-to-b from-primary to-emerald-400 rounded-r-full shadow-[0_0_12px_hsla(160,84%,39%,0.6)]" />
              )}

              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 relative",
                  isActive
                    ? "bg-gradient-to-br from-primary to-emerald-600 text-white shadow-lg shadow-primary/30 ring-1 ring-white/15"
                    : isCompleted
                    ? "bg-primary/15 text-primary ring-1 ring-primary/20"
                    : "bg-muted/30 text-muted-foreground group-hover:bg-muted/50 group-hover:text-foreground ring-1 ring-border/40"
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                {isActive && (
                  <span className="absolute inset-0 rounded-xl ring-2 ring-primary/30 animate-pulse-glow pointer-events-none" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "font-mono text-[9px] font-bold tabular-nums opacity-50",
                      isActive && "text-primary opacity-100"
                    )}
                  >
                    0{idx + 1}
                  </span>
                  <div
                    className={cn(
                      "font-bold text-sm tracking-tight",
                      isActive ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
                    )}
                  >
                    {step.label}
                  </div>
                </div>
                <div
                  className={cn(
                    "text-[11px] truncate mt-0.5",
                    isActive ? "text-primary/70" : "text-muted-foreground/60"
                  )}
                >
                  {step.sublabel}
                </div>
              </div>

              <ChevronRight
                className={cn(
                  "w-4 h-4 flex-shrink-0 transition-all duration-300",
                  isActive
                    ? "text-primary translate-x-0 opacity-100"
                    : "text-muted-foreground/40 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                )}
              />
            </button>
          );
        })}
      </nav>

      {/* God Mode Status */}
      {(isGodModeRunning || isGodModePaused) && (
        <div className="relative mx-3 mb-3 p-3.5 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 overflow-hidden">
          <div className="absolute inset-0 animate-shimmer opacity-50 pointer-events-none" />
          <div className="relative flex items-center gap-2 text-sm font-bold text-foreground">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center ring-1 ring-primary/30">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <span>God Mode</span>
            <span
              className={cn(
                "ml-auto px-2 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wider",
                isGodModeRunning
                  ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30"
                  : "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30"
              )}
            >
              {isGodModeRunning ? "Active" : "Paused"}
            </span>
          </div>
          <div className="relative mt-1.5 text-[11px] text-muted-foreground/80 pl-9">
            {godModeState.currentPhase ? (
              <span className="capitalize">{godModeState.currentPhase}…</span>
            ) : (
              <span>Queue · {godModeState.queue.length} items</span>
            )}
          </div>
        </div>
      )}

      {/* Footer Status */}
      <div className="relative p-4 border-t border-border/30 bg-gradient-to-t from-background/40 to-transparent">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              isGodModeRunning ? "bg-emerald-400 status-dot-active" : "bg-primary/60"
            )}
          />
          <span>{isGodModeRunning ? "Engine Active" : "System Ready"}</span>
        </div>
        <div className="text-[10px] text-muted-foreground/50 mt-1 font-mono tracking-tight">
          {totalItems} items · {completedItems} done
          {isGodModeRunning && ` · cycle ${godModeState.stats.cycleCount}`}
        </div>
      </div>
    </aside>
  );
}
