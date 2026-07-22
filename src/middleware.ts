import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "buildzuri.com";
const APP_SUBDOMAINS = new Set(["app", "api", "www", "mail", "admin", "staging"]);

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/settings",
  "/admin",
  "/website",
  "/content",
  "/analytics",
  "/agency-match",
  "/plan",
  "/help",
  "/notifications",
];
const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === "true";

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") ?? "";
  const { pathname } = req.nextUrl;

  const isInternalPath =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico";

  // ── 0. Maintenance mode — allow admin access, rewrite everything else ────
  if (
    MAINTENANCE_MODE &&
    !isInternalPath &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/maintenance")
  ) {
    return NextResponse.rewrite(new URL("/maintenance", req.url));
  }

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
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
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
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    const dest = profile?.onboarding_completed ? "/dashboard" : "/onboarding";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Incomplete onboarding should not land on app pages (except /onboarding)
  if (
    user &&
    isProtected &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/admin")
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && !profile.onboarding_completed) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
