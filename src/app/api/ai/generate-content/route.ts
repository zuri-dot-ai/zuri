import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geminiJSON, FLASH } from "@/lib/gemini";
import { CONTENT_DRAFT_SYSTEM, contentDraftPrompt } from "@/lib/prompts";
import { canvaDeepLink } from "@/lib/canva";
import type { ContentDraft } from "@/types/brand";
import type { Platform, PostType } from "@/types/database";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { platform, postType, theme, dayNumber, slotId } = (await request.json()) as {
    platform: Platform;
    postType: PostType;
    theme: string;
    dayNumber: number;
    slotId?: string;
  };

  const { data: profile } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 400 });

  // Growth tier unlocks video scripts
  const { data: account } = await supabase
    .from("users")
    .select("subscription_plan")
    .eq("id", user.id)
    .single();
  const includeVideo = account?.subscription_plan === "growth";

  try {
    // ── GEMINI 2.0 FLASH: draft the post ──
    const draft = await geminiJSON<ContentDraft>(
      contentDraftPrompt({ profile, platform, postType, theme, dayNumber, includeVideo }),
      { model: FLASH, system: CONTENT_DRAFT_SYSTEM, temperature: 0.85 }
    );

    const canva_url = canvaDeepLink(draft.canva_search_term);

    // If updating an existing calendar slot, persist the draft
    if (slotId) {
      await supabase
        .from("content_calendar")
        .update({
          ai_draft: draft.caption,
          hashtags: draft.hashtags,
          canva_url,
          status: "drafted",
        })
        .eq("id", slotId)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ draft, canva_url });
  } catch (err) {
    console.error("[generate-content]", err);
    return NextResponse.json(
      { error: "Could not draft content. Please try again." },
      { status: 500 }
    );
  }
}