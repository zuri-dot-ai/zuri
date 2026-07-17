import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** App root: never renders marketing content — session gate only. */
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}
