"use client";

import dynamic from "next/dynamic";

const ZuriParticleCanvas = dynamic(
  () =>
    import("@/components/ui/zuri-particle-canvas").then(
      (m) => m.ZuriParticleCanvas
    ),
  { ssr: false }
);

/** Full-screen decorative particle layer for auth pages. */
export function AuthParticleBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <ZuriParticleCanvas count={10} opacity={0.035} />
    </div>
  );
}
