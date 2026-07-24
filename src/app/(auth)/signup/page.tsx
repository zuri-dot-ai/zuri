import { redirect } from "next/navigation";

/**
 * Standalone /signup is retired — signup lives as Step 11 of the
 * anonymous /start funnel (docs/01_ONBOARDING_V2.md). Preserve plan query
 * params so pricing CTAs still work.
 */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value) && value[0]) qs.set(key, value[0]);
  }
  const query = qs.toString();
  redirect(query ? `/start?${query}` : "/start");
}
