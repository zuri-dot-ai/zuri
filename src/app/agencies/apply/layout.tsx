import { StarfieldCanvas } from "@/components/ui/starfield-canvas";
import { AuthBtnGhostPulse } from "@/components/ui/auth-btn-ghost-pulse";

/**
 * Public agency application flow — mirrors /start chrome (no marketing
 * NavBar/footer) so the wizard feels like a sibling of onboarding.
 */
export default function AgencyApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-canvas relative min-h-screen">
      <StarfieldCanvas />
      <AuthBtnGhostPulse />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
