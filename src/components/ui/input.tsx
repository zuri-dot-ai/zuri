import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-none border border-[hsl(var(--input))] bg-[hsl(var(--surface-form))] px-4 py-2 text-sm text-foreground transition-colors",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:border-gold",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
