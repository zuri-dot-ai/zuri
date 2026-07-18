import { createClient } from "@/lib/supabase/server";
import { PlanView } from "@/components/app/plan-view";

export default async function PlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: tasks }, { data: progress }] = await Promise.all([
    supabase
      .from("action_plan_tasks")
      .select("*")
      .eq("user_id", user!.id)
      .order("day_number", { ascending: true }),
    supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle(),
  ]);

  return <PlanView tasks={tasks ?? []} progress={progress} />;
}
