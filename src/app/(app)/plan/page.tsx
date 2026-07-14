import { createClient } from "@/lib/supabase/server";
import { CalendarCheck } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { PlanView } from "@/components/app/plan-view";

export default async function PlanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: tasks }, { data: progress }] = await Promise.all([
    supabase.from("action_plan_tasks").select("*").eq("user_id", user!.id).order("day_number"),
    supabase.from("user_progress").select("*").eq("user_id", user!.id).maybeSingle(),
  ]);

  if (!tasks || tasks.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 font-heading text-4xl font-semibold">Your 90-Day Plan</h1>
        <EmptyState
          icon={CalendarCheck}
          title="No plan yet"
          description="Complete onboarding and Zuri will generate your full 90-day action plan."
          actionLabel="Go to onboarding"
          actionHref="/onboarding"
        />
      </div>
    );
  }

  return <PlanView tasks={tasks} progress={progress} />;
}