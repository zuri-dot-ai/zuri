import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geminiJSON, FLASH } from "@/lib/gemini";
import type { AgencyBrief } from "@/types/brand";
import { serviceLines } from "@/types/brand";

const BRIEF_SYSTEM = `
You are Zuri's agency-brief writer. Generate a concise, professional brief
that a business owner can send to a marketing agency. Base it entirely on
their brand profile. Return ONLY valid JSON:
{
  "business_summary": "string",
  "goals": ["string"],
  "platforms": ["string"],
  "content_volume": "string",
  "budget_range": "string",
  "timeline": "string"
}
`.trim();

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("business_profiles").select("*").eq("user_id", user.id).single();
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 400 });

  try {
    const brief = await geminiJSON<AgencyBrief>(
      `Write an agency brief for: ${profile.business_name} (${profile.industry}) in ${profile.location}. ` +
      `Services: ${serviceLines(profile.services).join("; ")}. Audience: ${profile.target_audience}. Tone: ${profile.brand_tone}.`,
      { model: FLASH, system: BRIEF_SYSTEM, temperature: 0.6 }
    );
    return NextResponse.json({ brief });
  } catch {
    return NextResponse.json({ error: "Could not generate brief" }, { status: 500 });
  }
}