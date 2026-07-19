import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  accent?: boolean;
  className?: string;
  /** Optional trend: positive / negative / flat — shows a sparkline placeholder */
  trend?: "up" | "down" | "flat";
}

function Sparkline({ trend = "flat" }: { trend?: "up" | "down" | "flat" }) {
  const points =
    trend === "up"
      ? "0,14 8,12 16,10 24,7 32,4 40,2"
      : trend === "down"
        ? "0,2 8,5 16,7 24,10 32,12 40,14"
        : "0,8 8,9 16,7 24,8 32,9 40,8";
  const color =
    trend === "up" ? "#3D9970" : trend === "down" ? "#C0392B" : "var(--text-tertiary)";

  return (
    <svg
      width="48"
      height="16"
      viewBox="0 0 40 16"
      fill="none"
      aria-hidden
      className="mt-3 opacity-70"
    >
      <polyline
        points={points}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  className,
  trend = "flat",
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-md border border-border bg-[var(--bg-secondary)] p-5 transition-shadow hover:shadow-[var(--elevation-2)]",
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-caption font-medium text-[var(--text-tertiary)]">
          {label}
        </p>
        <p
          className={cn(
            "mt-2 text-2xl font-semibold tracking-[-0.02em]",
            accent && "text-gold"
          )}
        >
          {value}
        </p>
        {hint && (
          <p className="mt-1 text-caption text-[var(--text-tertiary)]">{hint}</p>
        )}
        <Sparkline trend={trend} />
      </div>
      {Icon && (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold/10 text-gold">
          <Icon className="size-4" strokeWidth={1.75} />
        </div>
      )}
    </div>
  );
}
