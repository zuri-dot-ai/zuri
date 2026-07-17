import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-[0.85rem] font-medium tracking-[0.05em] uppercase transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 rounded-none",
  {
    variants: {
      variant: {
        default: "btn-gold",
        outline: "btn-ghost",
        secondary: "btn-ghost",
        ghost: "btn-ghost",
        link: "text-gold underline-offset-4 hover:underline normal-case tracking-normal",
        destructive:
          "bg-error text-foreground hover:bg-error/90 tracking-[0.05em] uppercase",
      },
      size: {
        default: "min-h-[44px] px-8 py-3",
        sm: "min-h-[36px] px-5 py-2 text-xs",
        lg: "min-h-[52px] px-10 py-4",
        icon: "h-11 w-11 p-0",
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
