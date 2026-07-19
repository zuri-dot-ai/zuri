import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium tracking-[-0.01em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,162,39,0.35)] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 rounded-sm",
  {
    variants: {
      variant: {
        default:
          "bg-gold text-[var(--accent-foreground)] hover:brightness-110 active:scale-[0.98]",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-[var(--bg-elevated)] hover:border-[var(--border-hover)]",
        secondary:
          "border border-border bg-transparent text-foreground hover:bg-[var(--bg-elevated)] hover:border-[var(--border-hover)]",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-[var(--bg-elevated)] hover:text-foreground",
        link: "text-gold underline-offset-4 hover:underline",
        destructive:
          "bg-error text-foreground hover:bg-error/90",
      },
      size: {
        default: "min-h-[40px] px-5 py-2.5",
        sm: "min-h-[32px] px-3.5 py-1.5 text-xs",
        lg: "min-h-[48px] px-7 py-3",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
