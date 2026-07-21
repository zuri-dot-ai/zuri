"use client";

import { Check } from "lucide-react";
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
  /** Smoother multi-stop gradient bar instead of hard color blocks */
  gradientSwatch?: string;
  className?: string;
  multi?: boolean;
  /** Icon + title only, denser category grid */
  compact?: boolean;
  /** Slight scale on selected (brand feel) */
  scaleOnSelect?: boolean;
}

export function SelectionCard({
  label,
  descriptor,
  icon: Icon,
  selected = false,
  onSelect,
  swatches,
  gradientSwatch,
  className,
  multi = false,
  compact = false,
  scaleOnSelect = false,
}: SelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full flex-col items-start gap-2 rounded-sm border bg-[var(--bg-secondary)] text-left transition-all duration-150",
        compact ? "min-h-[44px] p-3.5" : "min-h-[44px] p-4",
        "hover:border-[var(--border-hover)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/35",
        selected
          ? "border-gold bg-gold/[0.08]"
          : "border-border",
        scaleOnSelect && selected && "scale-[1.02] motion-reduce:scale-100",
        className
      )}
    >
      {(gradientSwatch || (swatches && swatches.length > 0)) && (
        <div
          className="mb-1 h-2.5 w-full overflow-hidden rounded-full"
          style={
            gradientSwatch
              ? { background: gradientSwatch }
              : {
                  background: `linear-gradient(90deg, ${(swatches ?? []).join(", ")})`,
                }
          }
        />
      )}

      <div className="flex w-full items-center gap-3">
        {Icon && (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-sm",
              selected
                ? "bg-gold/10 text-gold"
                : "bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
            )}
          >
            <Icon className="size-4" strokeWidth={1.75} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm font-medium tracking-[-0.01em]",
              selected ? "text-foreground" : "text-foreground"
            )}
            title={label}
          >
            {label}
          </p>
          {descriptor && !compact && (
            <p
              className="mt-0.5 line-clamp-2 text-xs leading-snug text-[var(--text-tertiary)]"
              title={descriptor}
            >
              {descriptor}
            </p>
          )}
        </div>
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all duration-150",
            selected
              ? "border-gold bg-gold/15 text-gold"
              : "border-border bg-transparent",
          )}
          aria-hidden
        >
          {selected ? (
            <Check className="size-3" strokeWidth={2.5} />
          ) : null}
        </span>
      </div>
    </button>
  );
}
