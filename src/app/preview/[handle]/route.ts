import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  htmlResponse,
  injectPreviewBanner,
  notFoundResponse,
} from "@/lib/website/serve-html";

export const dynamic = "force-dynamic";

/**
 * Owner-only preview — serves template_html for the authenticated owner's
 * site regardless of publish status (docs/02_WEBSITE_BUILDER.md §7.4).
 * Injects a fixed PreviewBanner via server-side string injection.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Service client: owner may be in preview/generating (not covered by
  // the public "published" RLS policy). Ownership is enforced via user_id.
  const service = createServiceClient();
  const { data: website } = await service
    .from("websites")
    .select("template_html, status, user_id")
    .eq("handle", handle)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!website?.template_html) return notFoundResponse();

  const html = injectPreviewBanner(website.template_html, website.status);
  return htmlResponse(html);
}
