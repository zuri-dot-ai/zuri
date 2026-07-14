"use client";

import dynamic from "next/dynamic";

const ZuriParticleCanvas = dynamic(
  () =>
    import("@/components/ui/zuri-particle-canvas").then(
      (m) => m.ZuriParticleCanvas
    ),
  { ssr: false }
);

/**
 * Minimal onboarding layout — no sidebar/topbar, particle canvas background.
 * Parent (auth) layout also provides a particle layer; this ensures the
 * onboarding surface always has the branded ambient backdrop.
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0C0C0E]">
      <div className="pointer-events-none absolute inset-0 z-0">
        <ZuriParticleCanvas count={12} opacity={0.04} />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(201,168,76,0.12) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
