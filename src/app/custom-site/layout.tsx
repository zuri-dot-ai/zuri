import { StarfieldCanvas } from "@/components/ui/starfield-canvas";

/**
 * Custom site premium funnel — mirrors /start and /agencies/apply chrome.
 */
export default function CustomSiteLayout({
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
