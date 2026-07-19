"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AnalyticsRange } from "@/lib/analytics/website-stats";

const OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export function AnalyticsRangeSelector({
  current,
}: {
  current: AnalyticsRange;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setRange(value: AnalyticsRange) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    router.push(`/analytics?${params.toString()}`);
  }

  return (
    <div
      className="flex flex-wrap gap-1 rounded-md border border-border bg-[var(--bg-secondary)] p-1"
      role="tablist"
      aria-label="Date range"
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={current === opt.value}
          onClick={() => setRange(opt.value)}
          className={cn(
            "rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
            current === opt.value
              ? "bg-[var(--bg-elevated)] text-gold"
              : "text-[var(--text-tertiary)] hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
