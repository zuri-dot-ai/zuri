import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/app/sidebar";
import { BottomTabs } from "@/components/app/bottom-tabs";
import { Topbar } from "@/components/app/topbar";
import { PaymentToast } from "@/components/app/payment-toast";
import { FirstVisitTour } from "@/components/app/first-visit-tour";

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

  return (
    <div className="app-shell flex h-dvh overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Mobile-only top chrome — desktop is sidebar-only */}
        <div className="md:hidden">
          <Topbar />
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-5 md:px-8 md:pb-8 md:pt-8">
          {children}
          <PaymentToast />
          <FirstVisitTour />
        </main>
      </div>
      <BottomTabs />
    </div>
  );
}
