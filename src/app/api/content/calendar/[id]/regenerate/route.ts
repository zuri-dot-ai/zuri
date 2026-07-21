import { NextResponse } from "next/server";
import { geminiJSON } from "@/lib/gemini";
import {
  requireContentUser,
  requireProCalendar,
} from "@/lib/content/api-helpers";
import { checkUsageLimit } from "@/lib/payments/feature-gate";
import { sanitizeForPrompt } from "@/lib/utils/sanitize";

export async function POST(
  _req: Request,
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
    .select("business_name, industry, brand_tone, tone, target_audience")
    .eq("user_id", auth.user.id)
    .single();

  const pillarName =
    (slot as { content_pillars?: { name?: string } }).content_pillars?.name ??
    "General";

  const prompt = `
Regenerate a social media content brief for a Nigerian business.

BUSINESS: ${sanitizeForPrompt(brand?.business_name)} (${sanitizeForPrompt(brand?.industry)})
AUDIENCE: ${sanitizeForPrompt(brand?.target_audience)}
TONE: ${sanitizeForPrompt(brand?.brand_tone ?? brand?.tone ?? "professional")}
PLATFORM: ${sanitizeForPrompt(slot.platform)}
FORMAT: ${sanitizeForPrompt(slot.format_type)}
PILLAR: ${sanitizeForPrompt(pillarName)}
CURRENT TOPIC (replace with a fresh idea): ${sanitizeForPrompt(slot.topic)}

Output ONLY valid JSON:
{
  "topic": "new specific topic",
  "hook": "new opening hook max 15 words",
  "brief": "2-3 sentence brief"
}
`;

  try {
    const regenerated = await geminiJSON<{
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

    return NextResponse.json({ slot: data });
  } catch (err) {
    console.error("[calendar regenerate]", err);
    return NextResponse.json(
      { error: "Could not regenerate. Please try again." },
      { status: 500 }
    );
  }
}
