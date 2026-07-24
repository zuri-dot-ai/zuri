import { redirect } from "next/navigation";

/** Canonical billing UI lives in Settings — keep /billing as a deep-link alias. */
export default function BillingPage() {
  redirect("/settings?tab=billing");
}
