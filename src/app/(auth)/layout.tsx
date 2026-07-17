import { StarfieldCanvas } from "@/components/ui/starfield-canvas";

/**
 * Auth route group — marketing black + single starfield (no favicon particles).
 */
export default function AuthLayout({
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
