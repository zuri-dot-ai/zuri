import { createClient } from "@/lib/supabase/server";
import { ContentStudio } from "@/components/app/content-studio";

export default async function ContentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: slots }, { data: account }] = await Promise.all([
    supabase.from("content_calendar").select("*").eq("user_id", user!.id).order("slot_date"),
    supabase.from("users").select("subscription_plan").eq("id", user!.id).single(),
  ]);

  return (
    <ContentStudio
      initialSlots={slots ?? []}
      plan={account?.subscription_plan ?? "free"}
    />
  );
}