import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex max-w-full items-center gap-1 rounded-sm border px-2.5 py-0.5 text-xs font-medium transition-colors [&>span]:truncate",
  {
    variants: {
      variant: {
        default:
          "border-border bg-transparent text-muted-foreground",
        outline: "border-border bg-transparent text-muted-foreground",
        success:
          "border-success/30 bg-success/10 text-success",
        muted:
          "border-border bg-[var(--bg-secondary)] text-[var(--text-tertiary)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      title={typeof children === "string" ? children : undefined}
      {...props}
    >
      {typeof children === "string" ? (
        <span className="truncate">{children}</span>
      ) : (
        children
      )}
    </span>
  );
}

export { badgeVariants };
