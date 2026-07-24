import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** App root: never renders marketing content — session gate only. */
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/start");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  redirect(profile?.onboarding_completed ? "/dashboard" : "/start");
}
