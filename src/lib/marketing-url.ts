/**
 * Apex marketing site (buildzuri.com) — separate static deploy.
 * Use only for logged-out / pre-signup links (Home, Pricing, About, Privacy, Terms).
 * In-app upgrade/billing stays on the app domain.
 */
export function marketingUrl(path = ""): string {
  const base = (
    process.env.NEXT_PUBLIC_MARKETING_URL || "https://buildzuri.com"
  ).replace(/\/$/, "");
  if (!path) return base;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
