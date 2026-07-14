import { createClient } from "@/lib/supabase/server";
import { Globe } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { WebsiteEditor } from "@/components/app/website-editor";
import type { WebsiteComposition } from "@/types/website";

export default async function WebsitePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: website }, { data: account }] = await Promise.all([
    supabase.from("websites").select("*").eq("user_id", user!.id).maybeSingle(),
    supabase.from("users").select("subscription_plan").eq("id", user!.id).single(),
  ]);

  if (!website?.composition_json) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 font-heading text-4xl font-semibold">Your Website</h1>
        <EmptyState
          icon={Globe}
          title="No website yet"
          description="Complete onboarding and Zuri will compose a premium website for your business."
          actionLabel="Go to onboarding"
          actionHref="/onboarding"
        />
      </div>
    );
  }

  return (
    <WebsiteEditor
      websiteId={website.id}
      composition={website.composition_json as WebsiteComposition}
      isPublished={website.is_published}
      slug={website.published_slug}
      plan={account?.subscription_plan ?? "free"}
    />
  );
}