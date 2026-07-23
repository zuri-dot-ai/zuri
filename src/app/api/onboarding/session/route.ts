import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { OnboardingState } from "@/lib/onboarding/types";
import { resolveArchetypeFromCategory } from "@/lib/website/archetypes";

/**
 * PATCH /api/onboarding/session (docs/01_ONBOARDING_V2.md §7.2)
 * Merges a step's answers into the anonymous session's jsonb `data` column.
 * Debounced client-side (~500ms after the user stops interacting with a
 * step) — not fired on every keystroke.
 */

// Only known OnboardingState keys are ever merged — never trust arbitrary
// client-supplied keys into the stored jsonb blob.
const ALLOWED_KEYS: (keyof OnboardingState)[] = [
  "businessType",
  "resolvedArchetype",
  "services",
  "uploadedImages",
  "photoStepSkipped",
  "audienceTypes",
  "location",
  "locationCity",
  "brandVibe",
  "businessName",
  "handle",
  "platforms",
  "firstName",
];

function sanitizePatch(raw: unknown): Partial<OnboardingState> {
  if (!raw || typeof raw !== "object") return {};
  const input = raw as Record<string, unknown>;
  const out: Partial<OnboardingState> = {};

  for (const key of ALLOWED_KEYS) {
    if (!(key in input)) continue;
    const value = input[key];

    switch (key) {
      case "businessType":
      case "resolvedArchetype":
      case "location":
      case "locationCity":
      case "brandVibe":
      case "businessName":
      case "handle":
      case "firstName":
        if (typeof value === "string") {
          (out as Record<string, unknown>)[key] = sanitizeText(value);
        }
        break;
      case "photoStepSkipped":
        if (typeof value === "boolean") out.photoStepSkipped = value;
        break;
      case "audienceTypes":
      case "platforms":
        if (Array.isArray(value)) {
          (out as Record<string, unknown>)[key] = value
            .filter((v): v is string => typeof v === "string")
            .map((v) => sanitizeText(v))
            .slice(0, 10);
        }
        break;
      case "services":
        if (Array.isArray(value)) {
          out.services = value
            .filter(
              (v): v is { name: unknown; description: unknown } =>
                Boolean(v) && typeof v === "object"
            )
            .map((v) => ({
              name: sanitizeText((v as { name?: unknown }).name).slice(0, 40),
              description: sanitizeText(
                (v as { description?: unknown }).description
              ).slice(0, 70),
            }))
            .slice(0, 6);
        }
        break;
      case "uploadedImages":
        if (Array.isArray(value)) {
          out.uploadedImages = value
            .filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === "object")
            .map((v) => ({
              slotType: sanitizeText(v.slotType),
              cloudinaryPublicId: sanitizeText(v.cloudinaryPublicId),
              cloudinaryUrl: sanitizeText(v.cloudinaryUrl),
              pairIndex: typeof v.pairIndex === "number" ? v.pairIndex : undefined,
            }))
            .slice(0, 20);
        }
        break;
    }
  }

  // Category always wins on archetype (Decision 3) — re-derive server-side
  // rather than trusting a client-computed value, in case Step 1's client
  // logic ever drifts from resolveArchetypeFromCategory().
  if (out.businessType) {
    out.resolvedArchetype = resolveArchetypeFromCategory(out.businessType);
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
    .from("anonymous_onboarding_sessions")
    .select("data, expires_at")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (fetchError && fetchError.code !== "PGRST116") {
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Session not found or expired" }, { status: 404 });
  }
  if (new Date(existing.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Session expired" }, { status: 410 });
  }

  const rateLimit = await checkRateLimit(
    service,
    sessionToken,
    "onboarding:session_patch"
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

  const patch = sanitizePatch(body.data);
  const mergedData = { ...(existing.data as Record<string, unknown>), ...patch };
  const step =
    typeof body.step === "number" && body.step > 0 ? Math.floor(body.step) : undefined;

  const updatePayload: Record<string, unknown> = { data: mergedData };
  if (step !== undefined) updatePayload.current_step = step;
  if (patch.resolvedArchetype) updatePayload.archetype = patch.resolvedArchetype;

  const { error: updateError } = await service
    .from("anonymous_onboarding_sessions")
    .update(updatePayload)
    .eq("session_token", sessionToken);

  if (updateError) {
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 });
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
    .from("anonymous_onboarding_sessions")
    .select("data, current_step, archetype, expires_at")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
  if (!data || new Date(data.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Session not found or expired" }, { status: 404 });
  }

  return NextResponse.json({
    data: data.data,
    currentStep: data.current_step,
    archetype: data.archetype,
  });
}
