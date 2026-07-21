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
        "before:from-transparent before:via-[rgba(201,168,76,0.08)] before:to-transparent",
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

/** Skeleton: single day-grouped calendar list card (matches SlotCard's
 * shape — icon row, title, meta row) so the Content list never flashes
 * blank or pops in with a mismatched layout. */
export function ContentCardSkeleton() {
  return (
    <div className="content-card space-y-2 p-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-3.5 w-3.5 rounded-full" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="ml-auto h-3 w-14 rounded-full" />
      </div>
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

/** Skeleton: one day-group block (header + a row of cards), repeated to
 * match the real day-grouped Content list. */
export function ContentDayGroupSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-b border-[var(--border-solid)] pb-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="ml-auto h-3 w-16" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <ContentCardSkeleton key={i} />
        ))}
      </div>
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

/** Skeleton: website preview thumbnail / iframe placeholder */
export function WebsitePreviewSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[240px] flex-col overflow-hidden rounded-sm border border-border bg-[var(--bg-secondary)]",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="relative flex-1 p-6">
        <Skeleton className="mb-4 h-3 w-24" />
        <Skeleton className="mb-3 h-8 w-3/4" />
        <Skeleton className="mb-6 h-4 w-1/2" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton: analytics chart block */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("zuri-card space-y-4", className)}>
      <Skeleton className="h-4 w-32" />
      <div className="flex h-40 items-end gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${30 + ((i * 17) % 70)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Skeleton: page header title block */
export function PageHeaderSkeleton() {
  return (
    <div className="mb-6 space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
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