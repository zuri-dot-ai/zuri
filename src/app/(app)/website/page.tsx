import { createClient } from "@/lib/supabase/server";
import { Globe } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { WebsiteStudio } from "@/components/app/website-studio";
import { CustomSiteCTA } from "@/components/website/CustomSiteCTA";
import { CustomProjectStatusCard } from "@/components/app/custom-project-status-card";
import { getActivePlanId } from "@/lib/payments/get-plan";
import {
  normalizeFilledEmbeds,
  normalizeFilledImages,
  normalizeFilledLinks,
} from "@/lib/website/recompose-html";
import { ensureLinkSlotsInWebsite } from "@/lib/website/ensure-link-slots";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import {
  isActiveCustomSiteStatus,
  type CustomSiteRequestStatus,
} from "@/lib/custom-site/types";
import type { ActiveTheme, DesignArchetype } from "@/types/website";

export default async function WebsitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: website }, planId, { data: customRequest }] =
    await Promise.all([
      supabase.from("websites").select("*").eq("user_id", user.id).maybeSingle(),
      getActivePlanId(supabase, user.id),
      supabase
        .from("custom_site_requests")
        .select("id, status, project_type, reviewer_notes")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (!website?.template_html) {
    const status = customRequest?.status as CustomSiteRequestStatus | undefined;
    const hasActiveCustom =
      status != null && isActiveCustomSiteStatus(status);

    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="page-head">
          <h1>Your Website</h1>
        </header>
        {hasActiveCustom || status === "declined" ? (
          <CustomProjectStatusCard
            status={status!}
            projectType={customRequest!.project_type}
            reviewerNotes={customRequest!.reviewer_notes}
          />
        ) : (
          <>
            <EmptyState
              variant="website"
              icon={Globe}
              title="No website yet"
              description="Complete onboarding and Zuri will compose a premium website for your business — or request a custom build for e-commerce, CMS, and membership sites."
              actionLabel="Go to onboarding"
              actionHref="/start"
              actionVariant="primary"
            />
            <CustomSiteCTA context="dashboard" />
          </>
        )}
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
  const openCustom =
    customRequest?.status != null &&
    isActiveCustomSiteStatus(customRequest.status as CustomSiteRequestStatus);

  // If Storage gained data-link-slot but this site's HTML is stale, recompose once.
  const ensured = await ensureLinkSlotsInWebsite(supabase, {
    id: website.id,
    user_id: user.id,
    template_id: website.template_id,
    template_html: website.template_html,
    filled_placeholders: website.filled_placeholders,
    filled_images: website.filled_images,
    filled_links: website.filled_links,
    filled_embeds: website.filled_embeds,
    active_theme: website.active_theme,
    archetype: website.archetype,
  });

  const filledLinks = normalizeFilledLinks(website.filled_links);
  const filledEmbeds = normalizeFilledEmbeds(website.filled_embeds);
  const htmlHasPicsumAfter =
    htmlHasPicsum || /picsum\.photos/i.test(ensured.templateHtml);

  return (
    <ErrorBoundary context="website-builder">
      <WebsiteStudio
        websiteId={website.id}
        filledPlaceholders={
          (website.filled_placeholders as Record<string, string>) ?? {}
        }
        filledImages={normalizeFilledImages(website.filled_images)}
        filledLinks={filledLinks}
        filledEmbeds={filledEmbeds}
        imageSlots={imageSlots}
        linkSlots={ensured.linkSlots}
        linksHealFailed={ensured.healFailed}
        activeTheme={(website.active_theme as ActiveTheme) ?? "theme-1"}
        archetype={(website.archetype as DesignArchetype | null) ?? null}
        isPublished={isPublished}
        slug={slug}
        handle={(website.handle as string | null) ?? slug}
        plan={planId}
        needsReview={Boolean(website.needs_review) || htmlHasPicsumAfter}
        hasOpenCustomRequest={openCustom}
      />
    </ErrorBoundary>
  );
}
