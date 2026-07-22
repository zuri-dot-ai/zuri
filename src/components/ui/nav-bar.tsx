import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

/**
 * Shared top nav bar for logged-out / marketing surfaces (agency directory,
 * agency profiles, apply form). Mirrors the in-app `Topbar` chrome (same
 * height, border, background, single Cormorant wordmark) so marketing
 * pages read as part of the same product instead of a separate app.
 */
export function NavBar({
  right,
  className,
}: {
  right?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-5",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center py-1">
        <Logo variant="app" href="/" size="sm" />
      </div>
      {right && <div className="flex items-center gap-4">{right}</div>}
    </header>
  );
}
