import { ZuriSpinner } from "@/components/ui/skeleton";

/**
 * Covers the RSC wait between /start finish → /onboarding Step12 so the
 * gap never reads as a blank screen (matches OnboardingPremiumLoader).
 */
export default function OnboardingLoading() {
  return (
    <div className="onboarding-shell flex min-h-dvh w-full flex-col items-center justify-center gap-5 px-5">
      <ZuriSpinner size={40} label="Building your presence" />
      <p className="text-sm text-[var(--text-tertiary)]">
        Building your presence…
      </p>
    </div>
  );
}
