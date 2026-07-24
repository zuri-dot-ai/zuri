import { redirect } from "next/navigation";

/** Legacy path used by emails / grace-period banner — alias to Settings Billing tab. */
export default function SettingsBillingPage() {
  redirect("/settings?tab=billing");
}
