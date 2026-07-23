import { StarfieldCanvas } from "@/components/ui/starfield-canvas";

/**
 * Public pre-signup onboarding entry point (docs/01_ONBOARDING_V2.md).
 * No auth required — mirrors (auth)/layout.tsx's minimal chrome (single
 * starfield, no marketing NavBar/footer) since this IS the primary signup
 * funnel, not a marketing page.
 */
export default function StartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-canvas relative min-h-screen">
      <StarfieldCanvas />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
