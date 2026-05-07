import { useMemo } from "react";
import { useOptimizerStore } from "@/lib/store";
import { FileText, CheckCircle2, Sparkles, Activity, Layers, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Premium dashboard KPI strip — surfaces high-signal pipeline metrics
 * across the top of every workflow step. Mobile-first responsive grid.
 */
export function DashboardKPIStrip() {
  const { contentItems, generatedContentsStore, godModeState } = useOptimizerStore();

  const stats = useMemo(() => {
    const total = contentItems.length;
    const completed = contentItems.filter((i) => i.status === "completed").length;
    const generating = contentItems.filter((i) => i.status === "generating").length;
    const generatedIds = Object.keys(generatedContentsStore || {});
    const qualityScores = generatedIds
      .map((id) => generatedContentsStore[id]?.qualityScore?.overall)
      .filter((s): s is number => typeof s === "number" && s > 0);
    const avgQuality = qualityScores.length
      ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
      : 0;
    const queueSize = godModeState?.queue?.length ?? 0;
    const godModeActive = godModeState?.status === "running";
    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, generating, avgQuality, queueSize, godModeActive, completionPct };
  }, [contentItems, generatedContentsStore, godModeState]);

  // Hide entirely if there's nothing to show — keeps the dashboard clean for new users.
  if (
    stats.total === 0 &&
    stats.queueSize === 0 &&
    !stats.godModeActive &&
    stats.avgQuality === 0
  ) {
    return null;
  }

  const cards = [
    {
      icon: Layers,
      label: "Pipeline",
      value: stats.total.toString(),
      hint: stats.total > 0 ? `${stats.completionPct}% complete` : "0 items",
      tone: "primary" as const,
    },
    {
      icon: CheckCircle2,
      label: "Completed",
      value: stats.completed.toString(),
      hint: stats.generating > 0 ? `${stats.generating} generating` : "ready to publish",
      tone: "success" as const,
    },
    {
      icon: Sparkles,
      label: "Avg Quality",
      value: stats.avgQuality > 0 ? `${stats.avgQuality}` : "—",
      hint: stats.avgQuality >= 90 ? "elite" : stats.avgQuality >= 80 ? "strong" : "build up",
      tone: stats.avgQuality >= 85 ? ("success" as const) : ("primary" as const),
    },
    {
      icon: stats.godModeActive ? Bot : Activity,
      label: stats.godModeActive ? "God Mode" : "Queue",
      value: stats.godModeActive ? "Live" : stats.queueSize.toString(),
      hint: stats.godModeActive
        ? godModeState.currentPhase || "running"
        : stats.queueSize > 0
        ? "waiting"
        : "empty",
      tone: stats.godModeActive ? ("active" as const) : ("muted" as const),
    },
  ];

  return (
    <div className="mb-4 md:mb-6 grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3 animate-fade-in">
      {cards.map((c) => (
        <KPICard key={c.label} {...c} />
      ))}
    </div>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  hint: string;
  tone: "primary" | "success" | "active" | "muted";
}) {
  const toneRing = {
    primary: "ring-primary/20 from-primary/10 text-primary",
    success: "ring-emerald-400/25 from-emerald-400/10 text-emerald-300",
    active: "ring-primary/40 from-primary/15 text-primary animate-pulse-glow",
    muted: "ring-white/10 from-white/5 text-zinc-300",
  }[tone];

  return (
    <div className="group glass-card rounded-2xl p-3 md:p-4 relative overflow-hidden">
      <div className="flex items-center gap-2 md:gap-2.5">
        <div
          className={cn(
            "w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center ring-1 bg-gradient-to-br to-transparent flex-shrink-0",
            toneRing
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] md:text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-bold truncate">
            {label}
          </div>
          <div className="text-lg md:text-xl font-bold text-foreground tabular-nums leading-tight tracking-tight">
            {value}
          </div>
        </div>
      </div>
      <div className="mt-1.5 md:mt-2 text-[10px] md:text-[11px] text-muted-foreground/70 truncate pl-10 md:pl-[46px]">
        {hint}
      </div>
    </div>
  );
}
