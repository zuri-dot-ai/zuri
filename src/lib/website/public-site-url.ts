export type SiteUrlMode = "path" | "subdomain";

const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "buildzuri.com";

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

/** How public live site URLs are formed (path until wildcard DNS is live). */
export function getSiteUrlMode(): SiteUrlMode {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL_MODE?.toLowerCase();
  if (explicit === "path") return "path";
  if (explicit === "subdomain") return "subdomain";

  if (ROOT_DOMAIN === "localhost:3000" || ROOT_DOMAIN.startsWith("localhost:")) {
    return "path";
  }

  return "subdomain";
}

/** Public URL for a published site (path or subdomain depending on mode). */
export function getPublicSiteUrl(handle: string): string {
  const slug = handle.trim();
  if (!slug) return APP_URL;

  if (getSiteUrlMode() === "path") {
    return `${APP_URL}/sites/${slug}`;
  }

  const protocol = ROOT_DOMAIN.includes("localhost") ? "http" : "https";
  return `${protocol}://${slug}.${ROOT_DOMAIN}`;
}

/** Human-readable URL label for onboarding / badges (no protocol). */
export function formatPublicSiteUrlLabel(handle: string): string {
  const url = getPublicSiteUrl(handle || "handle");
  return url.replace(/^https?:\/\//, "");
}

export function getRootDomain(): string {
  return ROOT_DOMAIN;
}

export function getAppUrl(): string {
  return APP_URL;
}
