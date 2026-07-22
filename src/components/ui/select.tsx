import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Native `<select>` wrapped with a styled, token-colored chevron so every
 * dropdown in the app shows the same custom arrow instead of the OS
 * default. Sized/padded to match `Input` (`h-10`, `px-3.5`).
 */
const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative flex">
        <select
          ref={ref}
          className={cn(
            "flex h-10 w-full appearance-none rounded-sm border border-[var(--border-solid)] bg-[var(--bg-secondary)] px-3.5 py-2 pr-9 text-sm text-foreground [transition-duration:var(--transition-fast)] transition-colors",
            "focus-visible:outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
