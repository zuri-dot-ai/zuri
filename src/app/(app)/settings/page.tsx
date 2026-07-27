import { createClient } from "@/lib/supabase/server";
import { SettingsView } from "@/components/app/settings-view";
import { getActivePlanId } from "@/lib/payments/get-plan";
import { normalizeTrialsUsed } from "@/lib/payments/trials";
import { isPlanId } from "@/lib/payments/plans";
import type {
  AccountView,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@/types/database";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; payment?: string }>;
}) {
  const sp = await searchParams;
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
        .select(
          "status, trial_ends_at, trial_tier, trials_used, trial_ended_at"
        )
        .eq("user_id", user!.id)
        .maybeSingle(),
      getActivePlanId(supabase, user!.id),
    ]);

  const meta = user!.user_metadata as Record<string, unknown> | undefined;
  const metaAvatar =
    (typeof meta?.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta?.picture === "string" && meta.picture) ||
    null;

  const trialTier =
    sub?.trial_tier && isPlanId(sub.trial_tier)
      ? (sub.trial_tier as SubscriptionPlan)
      : null;

  const account: AccountView = {
    id: user!.id,
    email: profile?.email ?? user!.email ?? null,
    full_name: profile?.full_name ?? null,
    avatar_url: profile?.avatar_url ?? metaAvatar ?? null,
    subscription_plan: planId,
    subscription_status: (sub?.status as SubscriptionStatus) ?? "inactive",
    trial_ends_at: sub?.trial_ends_at ?? null,
    trial_tier: trialTier,
    trials_used: normalizeTrialsUsed(sub?.trials_used),
    trial_ended_at: sub?.trial_ended_at ?? null,
  };

  return (
    <SettingsView
      account={account}
      profile={biz}
      initialTab={sp.tab}
      paymentStatus={sp.payment}
    />
  );
}
