import { createClient } from "@/lib/supabase/server";
import { SettingsView } from "@/components/app/settings-view";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: account }, { data: profile }] = await Promise.all([
    supabase.from("users").select("*").eq("id", user!.id).single(),
    supabase
      .from("business_profiles")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle(),
  ]);

  return <SettingsView account={account} profile={profile} />;
}
