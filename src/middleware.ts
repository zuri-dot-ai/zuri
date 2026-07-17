import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "buildzuri.com";
const APP_SUBDOMAINS = new Set(["app", "api", "www", "mail", "admin", "staging"]);

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/settings", "/admin"];
const AUTH_ROUTES = ["/login", "/signup"];

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") ?? "";
  const { pathname } = req.nextUrl;

  // Skip static/internal paths for subdomain rewrite (session still handled below for app)
  const isInternalPath =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico";

  // ── 1. Subdomain routing — handle.buildzuri.com → /sites/[handle] ────────
  if (!isInternalPath) {
    if (hostname.endsWith(`.${ROOT_DOMAIN}`) && !hostname.startsWith("www.")) {
      const handle = hostname.split(`.${ROOT_DOMAIN}`)[0];

      if (!APP_SUBDOMAINS.has(handle)) {
        return NextResponse.rewrite(
          new URL(`/sites/${handle}${pathname}`, req.url)
        );
      }
    }

    // Custom domain — user's own domain → /sites/custom-domain/[hostname]
    if (
      !hostname.includes(ROOT_DOMAIN) &&
      !hostname.includes("localhost") &&
      !hostname.includes("127.0.0.1") &&
      !hostname.includes("vercel.app")
    ) {
      return NextResponse.rewrite(
        new URL(`/sites/custom-domain/${hostname}${pathname}`, req.url)
      );
    }
  }

  // ── 2. Session refresh on every request ──────────────────────────────────
  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          );
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() verifies the JWT and refreshes the session when needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── 3. Route protection ──────────────────────────────────────────────────
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname === p);

  if (isProtected && !user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
