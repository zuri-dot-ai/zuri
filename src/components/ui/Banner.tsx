"use client";

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type BannerVariant = "info" | "warning" | "error" | "success";

const VARIANT_STYLES: Record<
  BannerVariant,
  { border: string; bg: string; icon: string; Icon: typeof Info }
> = {
  info: {
    border: "border-[#C9A84C]/30",
    bg: "bg-[#C9A84C]/5",
    icon: "text-[#C9A84C]",
    Icon: Info,
  },
  warning: {
    border: "border-amber-500/40",
    bg: "bg-amber-500/10",
    icon: "text-amber-500",
    Icon: AlertTriangle,
  },
  error: {
    border: "border-error/40",
    bg: "bg-error/10",
    icon: "text-error",
    Icon: XCircle,
  },
  success: {
    border: "border-success/40",
    bg: "bg-success/10",
    icon: "text-success",
    Icon: CheckCircle2,
  },
};

/**
 * Single shared surface for every user-facing status message in the
 * Content section — the AI-fallback notice, the Gemini rate-limit error,
 * and any future generation-failure surfacing all route through here
 * instead of raw tooltips, browser alerts, or one-off styled divs.
 */
export function Banner({
  variant,
  title,
  message,
  actions,
  className,
}: {
  variant: BannerVariant;
  title?: string;
  message: string;
  actions?: ReactNode;
  className?: string;
}) {
  const styles = VARIANT_STYLES[variant];
  const Icon = styles.Icon;

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "mb-4 flex flex-wrap items-start justify-between gap-3 rounded-md border px-4 py-3",
        styles.border,
        styles.bg,
        className
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", styles.icon)} />
        <div>
          {title && (
            <p className="text-card-title text-[var(--text-primary)]">{title}</p>
          )}
          <p className="text-card-body">{message}</p>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
