import { createClient } from "@/lib/supabase/server";
import { AgencyMarketplace } from "@/components/app/agency-marketplace";
import { getActivePlanId } from "@/lib/payments/get-plan";

export default async function AgenciesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: agencies }, planId] = await Promise.all([
    supabase
      .from("agencies")
      .select("*")
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("rating", { ascending: false }),
    getActivePlanId(supabase, user!.id),
  ]);

  return (
    <AgencyMarketplace agencies={agencies ?? []} plan={planId} />
  );
}
