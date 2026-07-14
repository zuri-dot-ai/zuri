import { AuthParticleBackground } from "@/components/auth/auth-particle-background";

/**
 * Auth route group layout — no sidebar/topbar.
 * Dark background with full-screen particle canvas.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-[#0C0C0E]">
      <AuthParticleBackground />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
