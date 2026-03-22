import { Settings, BarChart3, FileText, Check, Zap, Bot, Sparkles } from "lucide-react";
import { useOptimizerStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, label: "Setup & Config", sublabel: "API keys, WordPress", icon: Settings },
  { id: 2, label: "Strategy & Planning", sublabel: "Content engine", icon: BarChart3 },
  { id: 3, label: "Review & Export", sublabel: "Publish content", icon: FileText },
];

export function OptimizerNav() {
  const { currentStep, setCurrentStep, contentItems, godModeState } = useOptimizerStore();

  const totalItems = contentItems.length;
  const completedItems = contentItems.filter((i) => i.status === "completed").length;
  const isGodModeRunning = godModeState.status === 'running';
  const isGodModePaused = godModeState.status === 'paused';

  return (
    <aside className="w-[280px] bg-card/30 backdrop-blur-2xl border-r border-border/50 flex flex-col z-20 relative">
      {/* Logo */}
      <div className="p-5 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/15">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-foreground text-base tracking-tight">SOTA Engine</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Sparkles className="w-2.5 h-2.5 text-primary" />
              <span className="text-[10px] text-primary font-bold tracking-widest uppercase">v14.0 God Mode</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav Steps */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
        {steps.map((step) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={cn(
                "w-full flex items-start gap-3 p-3.5 rounded-xl text-left transition-all duration-200 group relative overflow-hidden",
                isActive
                  ? "bg-primary/8 border border-primary/25"
                  : "hover:bg-muted/20 border border-transparent hover:border-border/30"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-primary rounded-r-full" />
              )}
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200",
                isActive ? "bg-gradient-to-br from-primary to-emerald-600 text-white shadow-md shadow-primary/20" :
                  isCompleted ? "bg-primary/12 text-primary" :
                    "bg-muted/30 text-muted-foreground group-hover:bg-muted/50 group-hover:text-foreground"
              )}>
                {isCompleted ? <Check className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className={cn(
                  "font-semibold text-sm",
                  isActive ? "text-primary" : "text-foreground/70 group-hover:text-foreground"
                )}>
                  {step.label}
                </div>
                <div className={cn(
                  "text-xs truncate mt-0.5",
                  isActive ? "text-primary/60" : "text-muted-foreground/50 group-hover:text-muted-foreground"
                )}>
                  {step.sublabel}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* God Mode Status */}
      {(isGodModeRunning || isGodModePaused) && (
        <div className="mx-3 mb-3 p-3 bg-gradient-to-r from-primary/8 to-transparent border border-primary/15 rounded-xl">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Bot className="w-3.5 h-3.5" />
            God Mode
            <span className={cn(
              "ml-auto px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider",
              isGodModeRunning ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
            )}>
              {isGodModeRunning ? 'ACTIVE' : 'PAUSED'}
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground/60">
            {godModeState.currentPhase ? <span className="capitalize">{godModeState.currentPhase}...</span> : <span>Queue: {godModeState.queue.length}</span>}
          </div>
        </div>
      )}

      {/* Footer Status */}
      <div className="p-3 border-t border-border/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
          <div className={cn("w-1.5 h-1.5 rounded-full", isGodModeRunning ? "bg-emerald-500 status-dot-active" : "bg-primary/50")} />
          <span>{isGodModeRunning ? 'Engine Active' : 'System Ready'}</span>
        </div>
        <div className="text-[10px] text-muted-foreground/40 mt-0.5 font-mono">
          {totalItems} items • {completedItems} done
          {isGodModeRunning && ` • Cycle ${godModeState.stats.cycleCount}`}
        </div>
      </div>
    </aside>
  );
}
