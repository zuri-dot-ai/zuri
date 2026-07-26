import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/security/rate-limit";
import { sanitizeText, sanitizeUrl } from "@/lib/utils/sanitize";
import {
  isCustomSiteBudgetRange,
  isCustomSiteFeature,
  isCustomSiteProjectType,
  isCustomSiteTimeline,
  type CustomSiteFormState,
} from "@/lib/custom-site/types";

const ALLOWED_KEYS: (keyof CustomSiteFormState)[] = [
  "projectType",
  "description",
  "features",
  "customIntegrationsText",
  "otherFeaturesText",
  "budgetRange",
  "timeline",
  "referenceUrl",
];

function sanitizePatch(raw: unknown): Partial<CustomSiteFormState> {
  if (!raw || typeof raw !== "object") return {};
  const input = raw as Record<string, unknown>;
  const out: Partial<CustomSiteFormState> = {};

  for (const key of ALLOWED_KEYS) {
    if (!(key in input)) continue;
    const value = input[key];

    switch (key) {
      case "projectType":
        if (typeof value === "string" && isCustomSiteProjectType(value)) {
          out.projectType = value;
        } else if (value === "") {
          out.projectType = "";
        }
        break;
      case "description":
      case "customIntegrationsText":
      case "otherFeaturesText":
        if (typeof value === "string") {
          out[key] = sanitizeText(value).slice(0, 2000);
        }
        break;
      case "budgetRange":
        if (typeof value === "string" && isCustomSiteBudgetRange(value)) {
          out.budgetRange = value;
        } else if (value === "") {
          out.budgetRange = "";
        }
        break;
      case "timeline":
        if (typeof value === "string" && isCustomSiteTimeline(value)) {
          out.timeline = value;
        } else if (value === "") {
          out.timeline = "";
        }
        break;
      case "referenceUrl":
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (!trimmed) {
            out.referenceUrl = "";
          } else {
            out.referenceUrl = sanitizeUrl(trimmed) ?? "";
          }
        }
        break;
      case "features":
        if (Array.isArray(value)) {
          out.features = value
            .filter((v): v is string => typeof v === "string")
            .filter(isCustomSiteFeature)
            .slice(0, 10);
        }
        break;
    }
  }

  return out;
}

export async function PATCH(req: Request) {
  let body: { sessionToken?: string; step?: number; data?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sessionToken =
    typeof body.sessionToken === "string" ? body.sessionToken : "";
  if (!sessionToken) {
    return NextResponse.json({ error: "Missing sessionToken" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: existing, error: fetchError } = await service
    .from("anonymous_custom_site_sessions")
    .select("data, expires_at")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (fetchError && fetchError.code !== "PGRST116") {
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json(
      { error: "Session not found or expired" },
      { status: 404 }
    );
  }
  if (new Date(existing.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Session expired" }, { status: 410 });
  }

  const rateLimit = await checkRateLimit(
    service,
    sessionToken,
    "custom_site:session_patch"
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

  const patch = sanitizePatch(body.data);
  const mergedData = {
    ...(existing.data as Record<string, unknown>),
    ...patch,
  };
  const step =
    typeof body.step === "number" && body.step > 0
      ? Math.floor(body.step)
      : undefined;

  const updatePayload: Record<string, unknown> = { data: mergedData };
  if (step !== undefined) updatePayload.current_step = step;

  const { error: updateError } = await service
    .from("anonymous_custom_site_sessions")
    .update(updatePayload)
    .eq("session_token", sessionToken);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to save progress" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function GET(req: Request) {
  const sessionToken = new URL(req.url).searchParams.get("sessionToken") ?? "";
  if (!sessionToken) {
    return NextResponse.json({ error: "Missing sessionToken" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("anonymous_custom_site_sessions")
    .select("data, current_step, expires_at")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
  if (!data || new Date(data.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Session not found or expired" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: data.data,
    currentStep: data.current_step,
  });
}
