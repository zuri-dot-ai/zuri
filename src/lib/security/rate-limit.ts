import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

interface RateLimitConfig {
  limit: number; // Max requests
  windowSeconds: number; // Time window
}

// Rate limit definitions per endpoint category
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Auth (supplements Supabase built-in limits)
  "auth:signup": { limit: 5, windowSeconds: 3600 },
  "auth:login": { limit: 10, windowSeconds: 900 },
  "auth:reset_password": { limit: 3, windowSeconds: 3600 },

  // Onboarding
  "onboarding:complete": { limit: 3, windowSeconds: 3600 },
  "handle:check": { limit: 60, windowSeconds: 60 },

  // Onboarding V2 — anonymous, pre-signup (docs/01_ONBOARDING_V2.md §2.3)
  // Keyed by ip_hash (no user_id exists yet).
  "onboarding:start": { limit: 5, windowSeconds: 86400 },
  // Keyed by anonymous session token.
  "onboarding:session_patch": { limit: 30, windowSeconds: 3600 },

  // AI Generation (expensive — rate limit tightly)
  "generation:website": { limit: 3, windowSeconds: 3600 },
  "generation:content": { limit: 10, windowSeconds: 60 },
  "generation:image": { limit: 20, windowSeconds: 3600 },
  "generation:blog": { limit: 5, windowSeconds: 3600 },

  // Website operations
  "website:publish": { limit: 10, windowSeconds: 3600 },
  "website:custom_domain_add": { limit: 5, windowSeconds: 3600 },

  // Analytics tracking (per IP, per handle)
  "analytics:track": { limit: 30, windowSeconds: 60 },

  // Forms — 10 submissions per IP per hour (docs/02_WEBSITE_BUILDER.md §10 / v1 §13)
  "contact_form:submit": { limit: 10, windowSeconds: 3600 },
  "agency:inquire": { limit: 10, windowSeconds: 86400 },
  "agency:apply": { limit: 1, windowSeconds: 86400 },

  // General API
  "api:general": { limit: 120, windowSeconds: 60 },
  "api:ai": { limit: 20, windowSeconds: 60 },

  // Admin
  "admin:general": { limit: 200, windowSeconds: 60 },
};

export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string, // e.g. user_id or ip_address
  category: string
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const config = RATE_LIMITS[category] ?? RATE_LIMITS["api:general"];
  const windowStart = new Date(
    Date.now() - config.windowSeconds * 1000
  ).toISOString();

  const { count } = await supabase
    .from("rate_limit_log")
    .select("id", { count: "exact" })
    .eq("key", `${category}:${key}`)
    .gte("created_at", windowStart);

  const used = count ?? 0;
  const allowed = used < config.limit;

  if (allowed) {
    // Log this request
    await supabase.from("rate_limit_log").insert({
      key: `${category}:${key}`,
      category,
    });
  }

  return {
    allowed,
    remaining: Math.max(0, config.limit - used - 1),
    resetIn: config.windowSeconds,
  };
}

// Helper: standardized rate limit response
export function rateLimitExceededResponse(resetIn: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please wait and try again." },
    {
      status: 429,
      headers: {
        "Retry-After": String(resetIn),
        "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + resetIn),
      },
    }
  );
}
