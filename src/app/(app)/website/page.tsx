import { createClient } from "@/lib/supabase/server";
import { Globe } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { WebsiteEditor } from "@/components/app/website-editor";
import { getActivePlanId } from "@/lib/payments/get-plan";
import type { ActiveTheme, DesignArchetype } from "@/types/website";

export default async function WebsitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: website }, planId] = await Promise.all([
    supabase.from("websites").select("*").eq("user_id", user.id).maybeSingle(),
    getActivePlanId(supabase, user.id),
  ]);

  if (!website?.template_html) {
    return (
      <div className="mx-auto max-w-5xl">
        <header className="page-head">
          <h1>Your Website</h1>
        </header>
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

  const isPublished =
    website.status === "published" || website.is_published === true;
  const slug =
    (website.handle as string | null) ??
    (website.published_slug as string | null) ??
    null;

  return (
    <WebsiteEditor
      websiteId={website.id}
      templateHtml={website.template_html as string}
      filledPlaceholders={
        (website.filled_placeholders as Record<string, string>) ?? {}
      }
      activeTheme={(website.active_theme as ActiveTheme) ?? "theme-1"}
      archetype={(website.archetype as DesignArchetype | null) ?? null}
      isPublished={isPublished}
      slug={slug}
      plan={planId}
    />
  );
}
