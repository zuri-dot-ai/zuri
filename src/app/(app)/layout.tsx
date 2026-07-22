import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/app/sidebar";
import { BottomTabs } from "@/components/app/bottom-tabs";
import { Topbar } from "@/components/app/topbar";
import { PaymentToast } from "@/components/app/payment-toast";
import { FirstVisitTour } from "@/components/app/first-visit-tour";
import { CommandPalette } from "@/components/app/command-palette";
import { AppShellProviders } from "@/components/app/app-shell-providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GracePeriodBanner } from "@/components/app/GracePeriodBanner";
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
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const inGracePeriod = subscription?.status === "grace_period";
  const gracePeriodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "your next billing date";

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
            <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-5 md:px-8 md:pb-8 md:pt-8">
              <ErrorBoundary context="dashboard">{children}</ErrorBoundary>
              <PaymentToast />
              <FirstVisitTour />
            </main>
          </div>
          <BottomTabs />
          <CommandPalette />
        </div>
      </AppShellProviders>
    </TooltipProvider>
  );
}
