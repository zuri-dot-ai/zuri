import { createClient } from "@/lib/supabase/server";
import { AgencyMarketplace } from "@/components/app/agency-marketplace";

export default async function AgenciesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: agencies }, { data: account }] = await Promise.all([
    supabase.from("agencies").select("*").eq("is_active", true).order("is_featured", { ascending: false }).order("rating", { ascending: false }),
    supabase.from("users").select("subscription_plan").eq("id", user!.id).single(),
  ]);

  return (
    <AgencyMarketplace
      agencies={agencies ?? []}
      plan={account?.subscription_plan ?? "free"}
    />
  );
}