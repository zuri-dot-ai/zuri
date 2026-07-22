import { createServiceClient } from "@/lib/supabase/service";
import {
  htmlResponse,
  injectConsentBanner,
  injectContactFormEndpoint,
  injectTrackingScript,
  loadDevFixtureHtml,
  notFoundResponse,
  sanitizeServedImages,
  SUSPENDED_PAGE_HTML,
} from "@/lib/website/serve-html";
import type { DesignArchetype } from "@/types/website";

export const dynamic = "force-dynamic";

/**
 * Public site renderer — serves stored template_html as raw HTML
 * (docs/02_WEBSITE_BUILDER.md §7.3).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const supabase = createServiceClient();

  const { data: website, error } = await supabase
    .from("websites")
    .select("template_html, status, user_id, archetype, analytics_enabled")
    .eq("handle", handle)
    .maybeSingle();

  // Remote DB may still be on v1 (no template_html column). Until
  // 20260716_website_builder_v2_templates.sql is applied, serve Session 2B
  // fixtures in development so middleware + HTML Response can be verified.
  if (error?.code === "PGRST204") {
    const fixture = loadDevFixtureHtml(handle);
    if (fixture) {
      return htmlResponse(
        injectContactFormEndpoint(sanitizeServedImages(fixture), {
          handle,
          ownerEmail: "",
        })
      );
    }
    return notFoundResponse();
  }

  if (!website) {
    const fixture = loadDevFixtureHtml(handle);
    if (fixture) {
      return htmlResponse(
        injectContactFormEndpoint(sanitizeServedImages(fixture), {
          handle,
          ownerEmail: "",
        })
      );
    }
    return notFoundResponse();
  }

  if (website.status === "suspended") {
    return htmlResponse(SUSPENDED_PAGE_HTML);
  }
  if (website.status !== "published") return notFoundResponse();
  if (!website.template_html) {
    const fixture = loadDevFixtureHtml(handle);
    if (fixture) {
      return htmlResponse(
        injectContactFormEndpoint(sanitizeServedImages(fixture), {
          handle,
          ownerEmail: "",
        })
      );
    }
    return notFoundResponse();
  }

  let ownerEmail = "";
  if (website.user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", website.user_id)
      .maybeSingle();
    ownerEmail = profile?.email ?? "";
  }

  const sanitized = sanitizeServedImages(
    website.template_html,
    website.archetype as DesignArchetype | null
  );
  let html = injectContactFormEndpoint(sanitized, {
    handle,
    ownerEmail,
  });
  if (website.analytics_enabled !== false) {
    html = injectConsentBanner(html);
    html = injectTrackingScript(html, handle);
  }

  return htmlResponse(html);
}
