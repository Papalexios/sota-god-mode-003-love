import { Settings, BarChart3, FileText, Bot } from "lucide-react";
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
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-3 mb-3 rounded-2xl bg-card/80 backdrop-blur-2xl border border-border/60 shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.5)]">
        <div className="grid grid-cols-3 relative">
          {/* sliding indicator */}
          <div
            className="absolute top-1.5 bottom-1.5 w-1/3 px-2 transition-transform duration-300 ease-out pointer-events-none"
            style={{ transform: `translateX(${(currentStep - 1) * 100}%)` }}
          >
            <div className="h-full w-full rounded-xl bg-gradient-to-br from-primary/20 to-emerald-600/10 border border-primary/30 shadow-inner" />
          </div>

          {tabs.map((t) => {
            const active = currentStep === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setCurrentStep(t.id)}
                className={cn(
                  "relative z-10 flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl transition-colors",
                  active ? "text-primary" : "text-muted-foreground/70 hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={cn("w-5 h-5 transition-transform", active && "scale-110")} />
                <span className="text-[10px] font-bold tracking-wide uppercase">{t.label}</span>
                {t.id === 3 && completed > 0 && (
                  <span className="absolute top-1 right-3 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                    {completed > 99 ? "99+" : completed}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isRunning && (
          <div className="px-3 pb-2 pt-0 flex items-center gap-2 text-[10px] font-semibold text-emerald-400">
            <Bot className="w-3 h-3" />
            <span className="status-dot-active w-1.5 h-1.5 rounded-full bg-emerald-500" />
            God Mode active · {godModeState.queue.length} queued
          </div>
        )}
      </div>
    </nav>
  );
}
