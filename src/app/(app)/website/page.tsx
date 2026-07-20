import { createClient } from "@/lib/supabase/server";
import { Globe } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { WebsiteStudio } from "@/components/app/website-studio";
import { getActivePlanId } from "@/lib/payments/get-plan";
import { normalizeFilledImages } from "@/lib/website/recompose-html";
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
          variant="website"
          icon={Globe}
          title="No website yet"
          description="Complete onboarding and Zuri will compose a premium website for your business."
          actionLabel="Go to onboarding"
          actionHref="/onboarding"
          actionVariant="primary"
        />
      </div>
    );
  }

  let imageSlots: string[] = [];
  if (website.template_id) {
    const { data: templateRow } = await supabase
      .from("templates")
      .select("image_slots")
      .eq("id", website.template_id)
      .maybeSingle();
    imageSlots = (templateRow?.image_slots as string[]) ?? [];
  }

  const isPublished =
    website.status === "published" || website.is_published === true;
  const slug =
    (website.handle as string | null) ??
    (website.published_slug as string | null) ??
    null;

  const htmlHasPicsum = /picsum\.photos/i.test(website.template_html ?? "");

  return (
    <WebsiteStudio
      websiteId={website.id}
      filledPlaceholders={
        (website.filled_placeholders as Record<string, string>) ?? {}
      }
      filledImages={normalizeFilledImages(website.filled_images)}
      imageSlots={imageSlots}
      activeTheme={(website.active_theme as ActiveTheme) ?? "theme-1"}
      archetype={(website.archetype as DesignArchetype | null) ?? null}
      isPublished={isPublished}
      slug={slug}
      handle={(website.handle as string | null) ?? slug}
      plan={planId}
      needsReview={Boolean(website.needs_review) || htmlHasPicsum}
    />
  );
}
