import { NextResponse } from "next/server";
import { nvidiaJSON } from "@/lib/content/nvidia-llm";
import {
  requireContentUser,
  requireProCalendar,
} from "@/lib/content/api-helpers";
import { checkUsageLimit } from "@/lib/payments/feature-gate";
import { sanitizeForPrompt } from "@/lib/utils/sanitize";
import { RATE_LIMIT_MESSAGE, isRateLimitError } from "@/lib/errors/gemini-errors";

const ADJUST_MODES = new Set([
  "punchier",
  "shorter",
  "more_formal",
  "more_casual",
  "custom",
]);

function adjustInstruction(
  mode: string | undefined,
  custom: string | undefined
): string | null {
  switch (mode) {
    case "punchier":
      return "Make the topic, hook, and brief punchier and more attention-grabbing. Keep the same underlying idea — do not invent a wholly new direction.";
    case "shorter":
      return "Tighten the topic, hook, and brief — shorter and sharper. Keep the same idea.";
    case "more_formal":
      return "Make the tone more formal and polished. Keep the same idea.";
    case "more_casual":
      return "Make the tone more casual and conversational. Keep the same idea.";
    case "custom":
      return custom?.trim()
        ? `Apply this instruction while keeping the same core idea: ${custom.trim().slice(0, 400)}`
        : null;
    default:
      return null;
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;

  const pro = await requireProCalendar(auth.supabase, auth.user.id);
  if ("error" in pro) return pro.error;

  const regen = await checkUsageLimit(
    auth.supabase,
    auth.user.id,
    "website_regenerations"
  );
  if (!regen.allowed) {
    return NextResponse.json(
      { error: "Regeneration limit reached for this month." },
      { status: 403 }
    );
  }

  let body: { mode?: string; instruction?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const mode =
    typeof body.mode === "string" && ADJUST_MODES.has(body.mode)
      ? body.mode
      : undefined;
  const instruction = adjustInstruction(
    mode,
    typeof body.instruction === "string" ? body.instruction : undefined
  );

  const { id } = await params;

  const { data: slot } = await auth.supabase
    .from("content_calendar")
    .select("*, content_pillars(name, description)")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single();

  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  const { data: brand } = await auth.supabase
    .from("business_profiles")
    .select(
      "business_name, industry, brand_tone, tone, target_audience, services, content_profile, pitch_line, tone_sample_choice"
    )
    .eq("user_id", auth.user.id)
    .single();

  const pillarName =
    (slot as { content_pillars?: { name?: string } }).content_pillars?.name ??
    "General";

  const { formatContentProfileForPrompt, parseContentProfile } = await import(
    "@/lib/content/content-profile"
  );
  const contentProfile = parseContentProfile(brand?.content_profile, {
    brand_tone: brand?.brand_tone ?? brand?.tone,
    target_audience: brand?.target_audience,
    services: brand?.services,
  });
  const profileBlock = formatContentProfileForPrompt(contentProfile);

  const reviseBlock = instruction
    ? `
INSTRUCTION: ${sanitizeForPrompt(instruction)}
Revise the CURRENT topic/hook/brief below — do not invent a wholly new direction.
CURRENT TOPIC: ${sanitizeForPrompt(slot.topic)}
CURRENT HOOK: ${sanitizeForPrompt(slot.hook ?? "")}
CURRENT BRIEF: ${sanitizeForPrompt(slot.brief ?? "")}
`
    : `
CURRENT TOPIC (replace with a fresh idea in the same pillar): ${sanitizeForPrompt(slot.topic)}
`;

  const prompt = `
${instruction ? "Revise" : "Regenerate"} a social media content brief for a Nigerian business.

BUSINESS: ${sanitizeForPrompt(brand?.business_name)} (${sanitizeForPrompt(brand?.industry)})
AUDIENCE: ${sanitizeForPrompt(contentProfile.target_customer || brand?.target_audience)}
TONE: ${sanitizeForPrompt(contentProfile.primary_tone)}
${profileBlock}
PLATFORM: ${sanitizeForPrompt(slot.platform)}
FORMAT: ${sanitizeForPrompt(slot.format_type)}
PILLAR: ${sanitizeForPrompt(pillarName)}
${reviseBlock}

Output ONLY valid JSON:
{
  "topic": "specific topic",
  "hook": "opening hook max 15 words",
  "brief": "2-3 sentence brief"
}
`;

  try {
    const regenerated = await nvidiaJSON<{
      topic: string;
      hook: string;
      brief: string;
    }>(prompt, "flash");

    const needs_review =
      /\[[^\]]+\]/.test(regenerated.topic) ||
      /\[[^\]]+\]/.test(regenerated.hook) ||
      /\[[^\]]+\]/.test(regenerated.brief);

    const { data, error } = await auth.supabase
      .from("content_calendar")
      .update({
        topic: regenerated.topic,
        hook: regenerated.hook,
        brief: regenerated.brief,
        needs_review,
        status: "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .select("*, content_pillars(id, name, color, icon)")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Failed to update slot" }, { status: 500 });
    }

    await auth.supabase.rpc("increment_usage", {
      p_user_id: auth.user.id,
      p_metric: "website_regenerations",
      p_amount: 1,
    });

    return NextResponse.json({ slot: { ...data, generation_source: "ai" } });
  } catch (err) {
    console.error(
      `[calendar regenerate] slotId=${id} userId=${auth.user.id}:`,
      err
    );
    if (isRateLimitError(err)) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }
    return NextResponse.json(
      { error: "Could not regenerate. Please try again." },
      { status: 500 }
    );
  }
}
