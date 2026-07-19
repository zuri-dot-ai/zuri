import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type EmptyVariant =
  | "website"
  | "content"
  | "notifications"
  | "analytics"
  | "generic";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  /** Visual treatment per feature area */
  variant?: EmptyVariant;
  /** Primary = gold CTA; secondary = ghost/outline */
  actionVariant?: "primary" | "secondary";
  className?: string;
}

function WebsiteIllustration() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="6" y="10" width="36" height="28" rx="6" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
      <path d="M6 18h36" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="14" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="17" cy="14" r="1.5" fill="currentColor" opacity="0.5" />
      <rect x="14" y="24" width="12" height="2" rx="1" fill="currentColor" opacity="0.35" />
      <rect x="14" y="29" width="20" height="2" rx="1" fill="currentColor" opacity="0.25" />
    </svg>
  );
}

function ContentIllustration() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="12" y="8" width="24" height="32" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M18 18h12M18 24h12M18 30h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function NotificationsIllustration() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
      <path
        d="M24 10c-5 0-9 3.5-9 9v5.5l-3 4.5h24l-3-4.5V19c0-5.5-4-9-9-9z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M20 36a4 4 0 008 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function AnalyticsIllustration() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M10 36V20M20 36V14M30 36V24M38 36V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 36h32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

function Illustration({ variant, icon: Icon }: { variant: EmptyVariant; icon?: LucideIcon }) {
  if (variant === "website") return <WebsiteIllustration />;
  if (variant === "content") return <ContentIllustration />;
  if (variant === "notifications") return <NotificationsIllustration />;
  if (variant === "analytics") return <AnalyticsIllustration />;
  if (Icon) return <Icon className="size-6" strokeWidth={1.75} />;
  return <ContentIllustration />;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  variant = "generic",
  actionVariant = "primary",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-md border border-border bg-[var(--bg-secondary)] px-6 py-20 text-center",
        className
      )}
    >
      <div className="flex size-16 items-center justify-center rounded-full border border-border bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
        <Illustration variant={variant} icon={Icon} />
      </div>
      <h3 className="mt-5 text-h2 font-semibold tracking-[-0.015em]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {actionLabel && actionHref && (
        <Button
          className="mt-6"
          variant={actionVariant === "secondary" ? "outline" : "default"}
          asChild
        >
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
