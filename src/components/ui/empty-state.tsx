import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  tone?: "default" | "primary" | "warning";
  compact?: boolean;
}

/**
 * Premium empty state — used across dashboard panels for zero-data scenarios.
 * Provides clear visual hierarchy + a CTA so users know exactly what to do next.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  tone = "default",
  compact = false,
}: EmptyStateProps) {
  const toneClasses = {
    default: "from-white/[0.03] to-transparent border-white/10",
    primary: "from-primary/[0.06] to-transparent border-primary/20",
    warning: "from-amber-500/[0.06] to-transparent border-amber-500/20",
  }[tone];

  const iconBg = {
    default: "bg-white/5 text-zinc-400 ring-white/10",
    primary: "bg-primary/15 text-primary ring-primary/30 shadow-[0_0_24px_-4px_hsl(var(--primary)/0.4)]",
    warning: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  }[tone];

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center text-center rounded-2xl border bg-gradient-to-b",
        compact ? "py-8 px-6 gap-3" : "py-12 px-6 gap-4",
        toneClasses,
        className
      )}
    >
      <div
        className={cn(
          "rounded-2xl flex items-center justify-center ring-1",
          compact ? "w-12 h-12" : "w-16 h-16",
          iconBg
        )}
      >
        <Icon className={cn(compact ? "w-5 h-5" : "w-7 h-7")} />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h3 className={cn("font-bold text-foreground tracking-tight", compact ? "text-sm" : "text-base")}>
          {title}
        </h3>
        {description && (
          <p className={cn("text-muted-foreground leading-relaxed", compact ? "text-xs" : "text-sm")}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}
