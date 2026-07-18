import { createClient } from "@/lib/supabase/server";
import { SettingsView } from "@/components/app/settings-view";
import { getActivePlanId } from "@/lib/payments/get-plan";
import type { AccountView, SubscriptionStatus } from "@/types/database";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: biz }, { data: sub }, planId] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
      supabase
        .from("business_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user!.id)
        .maybeSingle(),
      getActivePlanId(supabase, user!.id),
    ]);

  const account: AccountView = {
    id: user!.id,
    email: profile?.email ?? user!.email ?? null,
    full_name: profile?.full_name ?? null,
    avatar_url: profile?.avatar_url ?? null,
    subscription_plan: planId,
    subscription_status: (sub?.status as SubscriptionStatus) ?? "inactive",
  };

  return <SettingsView account={account} profile={biz} />;
}
