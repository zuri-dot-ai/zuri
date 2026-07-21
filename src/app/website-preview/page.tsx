import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FullScreenPreview } from "@/components/app/website-studio/FullScreenPreview";

/**
 * Dedicated, chrome-free full-screen preview — deliberately outside the
 * `(app)` layout group so it never inherits the Sidebar/Topbar/BottomTabs
 * shell. Renders the site at true viewport width with a single back button,
 * never a simulated device stage.
 */
export default async function WebsitePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ handle?: string; v?: string }>;
}) {
  const { handle: handleParam, v } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let handle = handleParam ?? null;
  if (!handle) {
    const { data: website } = await supabase
      .from("websites")
      .select("handle, published_slug")
      .eq("user_id", user.id)
      .maybeSingle();
    handle =
      (website?.handle as string | null) ??
      (website?.published_slug as string | null) ??
      null;
  }

  if (!handle) redirect("/website");

  return <FullScreenPreview handle={handle} refreshKey={v ?? "0"} />;
}
