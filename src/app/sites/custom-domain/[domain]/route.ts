import { createServiceClient } from "@/lib/supabase/service";
import {
  htmlResponse,
  injectContactFormEndpoint,
  notFoundResponse,
  SUSPENDED_PAGE_HTML,
} from "@/lib/website/serve-html";

export const dynamic = "force-dynamic";

/**
 * Custom-domain site renderer — same HTML serving as /sites/[handle],
 * looked up by websites.custom_domain (middleware §7.2 rewrite target).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain: rawDomain } = await params;
  // Host may include a port; custom_domain is stored without one.
  const domain = decodeURIComponent(rawDomain).split(":")[0].toLowerCase();
  const supabase = createServiceClient();

  const { data: website } = await supabase
    .from("websites")
    .select("template_html, status, user_id, handle")
    .eq("custom_domain", domain)
    .maybeSingle();

  if (!website) return notFoundResponse();
  if (website.status === "suspended") {
    return htmlResponse(SUSPENDED_PAGE_HTML);
  }
  if (website.status !== "published" || !website.template_html) {
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

  const html = injectContactFormEndpoint(website.template_html, {
    handle: website.handle,
    ownerEmail,
  });

  return htmlResponse(html);
}
