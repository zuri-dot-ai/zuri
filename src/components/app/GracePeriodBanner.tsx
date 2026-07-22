import Link from "next/link";
import { ERROR_MESSAGES } from "@/lib/errors/messages";

interface Props {
  /** ISO date or preformatted string — grace period end date. */
  gracePeriodEnd: string;
}

/**
 * Persistent warning banner shown across all dashboard pages during the
 * 3-day grace period after a payment failure. Never hard-blocks — the user
 * keeps full access to existing features.
 */
export function GracePeriodBanner({ gracePeriodEnd }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
      <span>{ERROR_MESSAGES.GRACE_PERIOD(gracePeriodEnd)}</span>
      <Link
        href="/settings/billing"
        className="ml-4 whitespace-nowrap text-amber-300 underline"
      >
        Update payment
      </Link>
    </div>
  );
}
