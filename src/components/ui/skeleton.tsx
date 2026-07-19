import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Premium shimmer skeleton. Uses the `animate-shimmer` keyframe defined
 * in tailwind.config.ts. Render any shape by passing width/height via className.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "relative overflow-hidden rounded-md bg-[var(--bg-secondary)]",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-shimmer before:bg-gradient-to-r",
        "before:from-transparent before:via-white/5 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

/**
 * Premium CSS ring spinner — never rotates the logo.
 */
export function ZuriSpinner({
  size = 32,
  className,
  label = "Loading",
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  const lg = size >= 28;
  return (
    <div
      className={cn("flex items-center justify-center", className)}
      role="status"
      aria-label={`${label}…`}
    >
      <span
        className={cn("zuri-spinner", lg && "zuri-spinner--lg")}
        style={
          size !== 20 && size !== 32
            ? { width: size, height: size }
            : undefined
        }
      />
      <span className="sr-only">{label}…</span>
    </div>
  );
}

/** Skeleton: stat card (used on dashboard) */
export function StatCardSkeleton() {
  return (
    <div className="zuri-card">
      <Skeleton className="mb-3 h-3 w-20" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-3 h-3 w-16" />
    </div>
  );
}

/** Skeleton: today's task card */
export function TaskCardSkeleton() {
  return (
    <div className="zuri-card space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="mt-4 flex gap-3">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  );
}

/** Skeleton: content studio draft */
export function ContentSlotSkeleton() {
  return (
    <div className="zuri-card space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

/** Skeleton: agency marketplace card */
export function AgencyCardSkeleton() {
  return (
    <div className="zuri-card space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

/** Skeleton: 90-day plan row */
export function PlanRowSkeleton() {
  return (
    <div className="zuri-card flex items-center gap-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

/** Composite: stacked dashboard skeleton block */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <TaskCardSkeleton />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-40 lg:col-span-2" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}