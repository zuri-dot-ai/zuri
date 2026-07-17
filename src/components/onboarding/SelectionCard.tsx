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
        "flex w-full flex-col items-start gap-2 border bg-[hsl(var(--surface))] p-4 text-left transition-colors duration-200",
        "hover:border-gold/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
        selected ? "border-gold" : "border-[hsl(var(--border))]",
        className
      )}
    >
      {swatches && swatches.length > 0 && (
        <div className="mb-1 flex h-2 w-full overflow-hidden">
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
              "flex size-9 shrink-0 items-center justify-center border",
              selected
                ? "border-gold/40 text-gold"
                : "border-[hsl(var(--border))] text-muted-foreground"
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
              "mt-0.5 size-4 shrink-0 border transition-colors",
              selected
                ? "border-gold bg-gold"
                : "border-[hsl(var(--border))] bg-transparent"
            )}
            aria-hidden
          />
        )}
      </div>
    </button>
  );
}
