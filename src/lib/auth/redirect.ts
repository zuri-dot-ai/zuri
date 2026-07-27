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

/**
 * Canonical public app origin (no trailing slash).
 * Prefer NEXT_PUBLIC_APP_URL so OAuth / auth callbacks never bounce users from
 * app.buildzuri.com onto *.vercel.app (which drops host-only anon cookies and
 * restarts onboarding at step 1).
 */
export function getConfiguredAppOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (!url.hostname) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function isVercelDeploymentHost(hostname: string): boolean {
  return hostname.endsWith(".vercel.app");
}

/**
 * Resolve the origin that post-auth redirects must use.
 *
 * Priority:
 * 1. NEXT_PUBLIC_APP_URL (canonical custom domain in production)
 * 2. Request Host / x-forwarded-host when not a Vercel preview host
 *    (or when NEXT_PUBLIC_APP_URL itself is vercel.app / unset)
 * 3. requestUrl.origin as last resort
 */
export function getAppOrigin(request: Request): string {
  const configured = getConfiguredAppOrigin();
  const requestUrl = new URL(request.url);

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const hostHeader = request.headers.get("host")?.split(",")[0]?.trim();
  const requestHost = forwardedHost || hostHeader || requestUrl.host;

  if (configured) {
    const configuredHost = new URL(configured).hostname;
    // Always prefer the configured custom domain over a Vercel deployment host.
    if (
      !isVercelDeploymentHost(configuredHost) ||
      !requestHost ||
      isVercelDeploymentHost(requestHost)
    ) {
      return configured;
    }
  }

  if (requestHost && !isVercelDeploymentHost(requestHost)) {
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      (requestUrl.protocol === "http:" ? "http" : "https");
    return `${proto}://${requestHost}`;
  }

  if (configured) return configured;
  return requestUrl.origin;
}

/**
 * Build an app callback URL with a single-encoded relative `next` path.
 * Pass `window.location.origin` from the browser; in production we still
 * rewrite onto NEXT_PUBLIC_APP_URL when that is a non-Vercel canonical host
 * so Google OAuth cannot land on *.vercel.app.
 */
export function authCallbackUrl(origin: string, next: string): string {
  const path = safeNextPath(next);
  let base = origin;
  const configured = getConfiguredAppOrigin();
  if (configured) {
    try {
      const configuredHost = new URL(configured).hostname;
      const pageHost = new URL(origin).hostname;
      // If the page is on vercel.app but production is a custom domain, force
      // the custom domain. If the page is already on the custom domain, keep it.
      if (
        !isVercelDeploymentHost(configuredHost) &&
        (isVercelDeploymentHost(pageHost) || pageHost === configuredHost)
      ) {
        base = configured;
      }
    } catch {
      base = configured;
    }
  }
  const url = new URL("/api/auth/callback", base);
  url.searchParams.set("next", path);
  return url.toString();
}
