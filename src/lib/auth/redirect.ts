/**
 * Normalize OAuth / login `next` query values.
 * Unwraps accidental double-encoding (%252F → %2F → /) and rejects open redirects.
 */
export function safeNextPath(
  raw: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!raw) return fallback;

  let path = raw.trim();
  for (let i = 0; i < 3 && /%[0-9A-Fa-f]{2}/.test(path); i++) {
    try {
      const decoded = decodeURIComponent(path);
      if (decoded === path) break;
      path = decoded;
    } catch {
      break;
    }
  }

  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  return path;
}

/** Build an app callback URL with a single-encoded relative `next` path. */
export function authCallbackUrl(origin: string, next: string): string {
  const path = safeNextPath(next);
  const url = new URL("/api/auth/callback", origin);
  url.searchParams.set("next", path);
  return url.toString();
}
