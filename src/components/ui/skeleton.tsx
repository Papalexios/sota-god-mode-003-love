import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

/**
 * Premium shimmer skeleton — uses existing global `animate-shimmer` keyframe.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md border border-white/[0.04] bg-white/[0.04] animate-shimmer",
        className
      )}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="glass-card border border-white/10 rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="w-7 h-7 rounded-lg" />
        <Skeleton className="h-2.5 w-20" />
      </div>
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-2 w-16" />
    </div>
  );
}
