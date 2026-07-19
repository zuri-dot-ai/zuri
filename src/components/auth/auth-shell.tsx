"use client";

import { Logo } from "@/components/ui/logo";
import { marketingUrl } from "@/lib/marketing-url";
import { BRAND } from "@/lib/constants";

interface AuthShellProps {
  children: React.ReactNode;
  eyebrow?: string;
  headline: React.ReactNode;
  tagline?: React.ReactNode;
  socialProof?: string;
}

/**
 * Auth shell — tablet 50/50, desktop lg+ form takes 60%.
 * Uses marketing PNG logo on auth surfaces.
 */
export function AuthShell({
  children,
  eyebrow,
  headline,
  tagline,
  socialProof,
}: AuthShellProps) {
  return (
    <div className="relative grid min-h-screen w-full grid-cols-1 overflow-x-hidden bg-transparent md:grid-cols-2 lg:grid-cols-[2fr_3fr]">
      <aside className="relative z-10 hidden flex-col justify-between border-r border-[#222] p-10 md:flex lg:p-14">
        <Logo variant="image" size="navbar" href={marketingUrl()} />

        <div className="max-w-md">
          {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
          <h1 className="font-heading text-4xl font-medium leading-tight tracking-[0.01em] text-[var(--chrome-light)] lg:text-5xl">
            {headline}
          </h1>
          {tagline && (
            <p className="mt-4 text-base font-light leading-relaxed text-[var(--chrome-mid)] lg:text-lg">
              {tagline}
            </p>
          )}
        </div>

        <div className="space-y-1">
          {socialProof && (
            <p className="text-sm text-[var(--chrome-mid)]">
              <span className="text-gold">—</span> {socialProof}
            </p>
          )}
          <p className="text-xs text-[var(--chrome-dark)]">
            Built for Africa · Powered by Gemini
          </p>
        </div>
      </aside>

      <main className="relative z-10 flex min-h-screen w-full min-w-0 flex-col items-center justify-center px-5 py-12 md:px-10 md:py-16">
        <div className="mb-8 flex w-full max-w-md justify-center md:hidden">
          <Logo variant="image" size="navbar" href={marketingUrl()} />
        </div>

        <div className="w-full max-w-md min-w-0">{children}</div>

        <p className="mt-8 max-w-md text-center text-xs text-[var(--chrome-dark)] md:hidden">
          {BRAND.tagline}
        </p>
      </main>
    </div>
  );
}
