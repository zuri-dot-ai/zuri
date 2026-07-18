import { createClient } from "@/lib/supabase/server";
import { ContentStudio } from "@/components/app/content-studio";
import { getActivePlanId } from "@/lib/payments/get-plan";

export default async function ContentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: slots }, planId] = await Promise.all([
    supabase
      .from("content_calendar")
      .select("*")
      .eq("user_id", user!.id)
      .order("slot_date"),
    getActivePlanId(supabase, user!.id),
  ]);

  return (
    <ContentStudio initialSlots={slots ?? []} plan={planId} />
  );
}
