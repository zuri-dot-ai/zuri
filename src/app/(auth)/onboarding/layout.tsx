/**
 * Onboarding sits inside auth layout (starfield already present).
 * No second particle/starfield layer.
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="relative z-10 min-h-screen">{children}</div>;
}
