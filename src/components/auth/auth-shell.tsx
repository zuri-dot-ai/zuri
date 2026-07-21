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
      <aside className="relative z-10 hidden flex-col justify-between overflow-hidden p-10 md:flex lg:p-14">
        {/* Gradient/glow divider unifying the left panel with the form card */}
        <div
          aria-hidden
          className="absolute right-0 top-0 z-20 h-full w-px bg-gradient-to-b from-transparent via-[rgba(201,168,76,0.4)] to-transparent"
        />
        <div
          aria-hidden
          className="absolute right-0 top-0 z-20 h-full w-8 -translate-x-1/2 bg-gradient-to-b from-transparent via-[rgba(201,168,76,0.14)] to-transparent blur-md"
        />

        {/* Abstract dashboard-silhouette motif behind the headline, layered above the starfield but behind the copy */}
        <svg
          aria-hidden
          viewBox="0 0 400 400"
          className="pointer-events-none absolute left-0 top-1/3 z-0 h-[420px] w-[420px] -translate-x-1/4 opacity-[0.06]"
        >
          <rect x="24" y="40" width="160" height="100" rx="6" stroke="var(--gold)" strokeWidth="1.5" fill="none" />
          <rect x="24" y="160" width="70" height="70" rx="6" stroke="var(--gold)" strokeWidth="1.5" fill="none" />
          <rect x="110" y="160" width="74" height="70" rx="6" stroke="var(--gold)" strokeWidth="1.5" fill="none" />
          <line x1="220" y1="40" x2="220" y2="360" stroke="var(--gold)" strokeWidth="1.5" />
          <circle cx="300" cy="120" r="80" stroke="var(--gold)" strokeWidth="1.5" fill="none" />
          <path d="M240 320 L280 260 L320 290 L380 210" stroke="var(--gold)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <Logo variant="image" size="navbar" href={marketingUrl()} className="relative z-10" />

        <div className="relative z-10 max-w-md">
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

        <div className="relative z-10 space-y-1.5">
          {socialProof && (
            <p className="text-sm text-[var(--chrome-mid)]">
              <span className="text-gold">—</span> {socialProof}
            </p>
          )}
          <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--chrome-mid)]">
            <span className="text-gold">●</span> Built for Africa · Powered by Gemini
          </p>
        </div>
      </aside>

      <main className="relative z-10 flex min-h-screen w-full min-w-0 flex-col items-center justify-center px-5 py-12 md:px-10 md:py-16">
        <div className="mb-8 flex w-full max-w-md justify-center md:hidden">
          <Logo variant="image" size="navbar" href={marketingUrl()} />
        </div>

        <div className="w-full max-w-md min-w-0">{children}</div>

        <p className="mt-8 flex max-w-md items-center justify-center gap-1.5 text-center text-sm font-medium text-[var(--chrome-mid)] md:hidden">
          <span className="text-gold">●</span> {BRAND.tagline}
        </p>
      </main>
    </div>
  );
}
