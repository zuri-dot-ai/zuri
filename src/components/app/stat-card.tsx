import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  accent?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  className,
}: StatCardProps) {
  return (
    <div className={cn("surface flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <p className="stat-label text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "stat-value mt-2 font-mono text-2xl font-semibold tracking-tight",
            accent && "text-gold"
          )}
        >
          {value}
        </p>
        {hint && (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
      {Icon && (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-none border border-border bg-muted text-gold">
          <Icon className="size-5" strokeWidth={1.75} />
        </div>
      )}
    </div>
  );
}
