import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/app/sidebar";
import { BottomTabs } from "@/components/app/bottom-tabs";
import { Topbar } from "@/components/app/topbar";
import { PaymentToast } from "@/components/app/payment-toast";
import { Suspense } from "react";
import { FirstVisitTour } from "@/components/app/first-visit-tour";
import { CommandPalette } from "@/components/app/command-palette";
import { AppShellProviders } from "@/components/app/app-shell-providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GracePeriodBanner } from "@/components/app/GracePeriodBanner";
import { TrialPrompts } from "@/components/app/TrialPrompts";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select(
      "status, plan_id, current_period_end, grace_period_end, trial_ends_at, trial_tier, trial_ended_at"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const inGracePeriod = subscription?.status === "grace_period";
  const graceEndRaw =
    subscription?.grace_period_end ?? subscription?.current_period_end;
  const gracePeriodEnd = graceEndRaw
    ? new Date(graceEndRaw).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "your next billing date";

  const trialProps = {
    status: subscription?.status ?? "active",
    planId: subscription?.plan_id ?? "free",
    trialEndsAt: subscription?.trial_ends_at ?? null,
    trialTier: subscription?.trial_tier ?? null,
    trialEndedAt: subscription?.trial_ended_at ?? null,
  };

  return (
    <TooltipProvider delayDuration={280} skipDelayDuration={100}>
      <AppShellProviders>
        <div className="app-shell flex h-dvh overflow-hidden bg-background">
          <Sidebar />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="md:hidden">
              <Topbar />
            </div>
            {inGracePeriod && (
              <GracePeriodBanner gracePeriodEnd={gracePeriodEnd} />
            )}
            {!inGracePeriod && (
              <TrialPrompts {...trialProps} slot="banners" />
            )}
            <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-5 md:px-8 md:pb-8 md:pt-8">
              {!inGracePeriod && (
                <TrialPrompts {...trialProps} slot="inline" />
              )}
              <ErrorBoundary context="dashboard">{children}</ErrorBoundary>
              <PaymentToast />
              <Suspense fallback={null}>
                <FirstVisitTour />
              </Suspense>
            </main>
          </div>
          <BottomTabs />
          <CommandPalette />
        </div>
      </AppShellProviders>
    </TooltipProvider>
  );
}
