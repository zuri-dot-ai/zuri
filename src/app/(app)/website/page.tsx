import { createClient } from "@/lib/supabase/server";
import { Globe } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { WebsiteStudio } from "@/components/app/website-studio";
import { CustomSiteCTA } from "@/components/website/CustomSiteCTA";
import { CustomProjectStatusCard } from "@/components/app/custom-project-status-card";
import { getActivePlanId } from "@/lib/payments/get-plan";
import { normalizeFilledImages } from "@/lib/website/recompose-html";
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

  return (
    <ErrorBoundary context="website-builder">
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
        hasOpenCustomRequest={openCustom}
      />
    </ErrorBoundary>
  );
}
