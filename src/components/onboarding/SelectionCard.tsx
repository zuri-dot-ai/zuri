"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type IconComponent =
  | LucideIcon
  | ((props: { className?: string }) => React.ReactNode);

interface SelectionCardProps {
  label: string;
  descriptor?: string;
  icon?: IconComponent;
  selected?: boolean;
  onSelect: () => void;
  /** Optional color swatch strip (for brand vibe cards) */
  swatches?: string[];
  className?: string;
  multi?: boolean;
}

export function SelectionCard({
  label,
  descriptor,
  icon: Icon,
  selected = false,
  onSelect,
  swatches,
  className,
  multi = false,
}: SelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-200",
        "hover:border-gold/40 hover:bg-white/[0.03]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
        selected
          ? "border-gold bg-gold/10 shadow-[0_0_0_1px_rgba(201,168,76,0.25)]"
          : "border-white/10 bg-white/[0.02]",
        className
      )}
    >
      {swatches && swatches.length > 0 && (
        <div className="mb-1 flex h-2 w-full overflow-hidden rounded-full">
          {swatches.map((color) => (
            <span
              key={color}
              className="flex-1"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}

      <div className="flex w-full items-start gap-3">
        {Icon && (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              selected ? "bg-gold/20 text-gold" : "bg-white/5 text-white/60"
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-medium",
              selected ? "text-gold" : "text-foreground"
            )}
          >
            {label}
          </p>
          {descriptor && (
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              {descriptor}
            </p>
          )}
        </div>
        {multi && (
          <span
            className={cn(
              "mt-0.5 size-4 shrink-0 rounded border transition-colors",
              selected
                ? "border-gold bg-gold"
                : "border-white/20 bg-transparent"
            )}
            aria-hidden
          />
        )}
      </div>
    </button>
  );
}
