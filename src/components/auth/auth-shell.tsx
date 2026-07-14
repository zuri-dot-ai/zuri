"use client";

import dynamic from "next/dynamic";
import { Logo } from "@/components/ui/logo";

/**
 * Canvas particle layer is decorative + heavy — lazy-load it on the client only.
 */
const ZuriParticleCanvas = dynamic(
  () =>
    import("@/components/ui/zuri-particle-canvas").then(
      (m) => m.ZuriParticleCanvas
    ),
  { ssr: false }
);

interface AuthShellProps {
  /** Right-hand form panel content */
  children: React.ReactNode;
  /** Optional eyebrow text shown on the brand panel */
  eyebrow?: string;
  /** Brand panel headline */
  headline: React.ReactNode;
  /** Brand panel sub-tagline */
  tagline?: React.ReactNode;
  /** Trust / social-proof footer line on the brand panel */
  socialProof?: string;
  /** Particle density (count and opacity are spec-defined for auth pages) */
  particleCount?: number;
  particleOpacity?: number;
}

/**
 * Premium auth shell — full-screen split layout.
 *  • Brand panel (left, hidden on mobile): deep dark gradient + drifting Zuri
 *    particles, big headline, social-proof line.
 *  • Form panel (right, full-width on mobile): glassmorphism card with the
 *    form, against a subtle particle backdrop on mobile.
 *
 * Use this for /login, /signup, password reset, magic-link, etc.
 */
export function AuthShell({
  children,
  eyebrow,
  headline,
  tagline,
  socialProof,
  particleCount = 8,
  particleOpacity = 0.04,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-transparent">
      {/* Brand panel — only on md+ screens */}
      <aside className="pointer-events-none fixed inset-y-0 left-0 z-0 hidden md:block md:w-1/2">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-surface/60" />

        {/* Drifting particles */}
        <ZuriParticleCanvas count={particleCount} opacity={particleOpacity} />

        {/* Aurora highlight (top-left) */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 18% 18%, rgba(201,168,76,0.18) 0%, transparent 60%)",
          }}
        />
        {/* Bottom-right gold wash */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 90% 100%, rgba(201,168,76,0.08) 0%, transparent 65%)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col justify-between p-10 lg:p-14">
          <Logo size="md" />

          <div className="max-w-md">
            {eyebrow && (
              <p className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">
                {eyebrow}
              </p>
            )}
            <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight text-foreground lg:text-5xl">
              {headline}
            </h1>
            {tagline && (
              <p className="mt-4 text-base text-muted-foreground lg:text-lg">
                {tagline}
              </p>
            )}
          </div>

          <div className="space-y-1">
            {socialProof && (
              <p className="text-sm text-muted-foreground">
                <span className="font-mono text-gold">★</span> {socialProof}
              </p>
            )}
            <p className="text-xs text-white/30">
              Built for Africa · Powered by Gemini
            </p>
          </div>
        </div>
      </aside>

      {/* Form panel — full-width on mobile, right half on md+ */}
      <main className="relative z-10 flex min-h-screen w-full items-center justify-center px-5 py-12 md:ml-[50%] md:px-10 md:py-16">
        {/* Subtle grain/particles on mobile */}
        <div className="absolute inset-0 md:hidden">
          <ZuriParticleCanvas count={6} opacity={0.03} />
        </div>

        {/* Logo mobile-only — visible above the form on small screens */}
        <div className="absolute left-0 right-0 top-6 flex justify-center md:hidden">
          <Logo size="md" />
        </div>

        <div className="relative z-10 mt-12 w-full max-w-md md:mt-0">
          {children}
        </div>
      </main>
    </div>
  );
}
