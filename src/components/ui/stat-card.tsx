import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  accent?: boolean;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, accent, className }: StatCardProps) {
  return (
    <div className={cn("zuri-card flex items-center justify-between", className)}>
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn("mt-1 font-heading text-3xl font-semibold", accent && "text-gold")}>
          {value}
        </p>
      </div>
      {Icon && (
        <div className="flex size-11 items-center justify-center rounded-lg bg-gold/10 text-gold">
          <Icon className="size-5" />
        </div>
      )}
    </div>
  );
}