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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch business name for the topbar
  const { data: profile } = await supabase
    .from("business_profiles")
    .select("business_name")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="app-shell flex h-dvh overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar businessName={profile?.business_name ?? undefined} />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-5 md:px-8 md:pb-8">
          {children}
          <PaymentToast />
          <FirstVisitTour />
        </main>
      </div>
      <BottomTabs />
    </div>
  );
}
