import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeText } from "@/lib/utils/sanitize";

const MIN_SUBSTANTIVE_EDIT_CHARS = 15;
const MAX_VOICE_EXAMPLES = 10;

export async function captureVoiceExample(
  supabase: SupabaseClient,
  userId: string,
  text: string,
  source: "edited" | "rated" | "manual",
  platform?: string
): Promise<void> {
  const clean = sanitizeText(text);
  if (clean.length < 20) return;

  const { error: insertError } = await supabase
    .from("brand_voice_examples")
    .insert({
      user_id: userId,
      text: clean,
      source,
      platform: platform ?? null,
    });

  if (insertError) {
    console.error("[voice-bank] capture failed:", insertError);
    return;
  }

  const { data: all } = await supabase
    .from("brand_voice_examples")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (all && all.length > MAX_VOICE_EXAMPLES) {
    const toDelete = all.slice(MAX_VOICE_EXAMPLES).map((r) => r.id);
    await supabase.from("brand_voice_examples").delete().in("id", toDelete);
  }
}

export function isSubstantiveEdit(original: string, edited: string): boolean {
  if (original === edited) return false;
  const diff = Math.abs(original.length - edited.length);
  const originalWords = new Set(original.toLowerCase().split(/\s+/));
  const editedWords = edited.toLowerCase().split(/\s+/);
  const retained = editedWords.filter((w) => originalWords.has(w)).length;
  const retentionRatio = editedWords.length ? retained / editedWords.length : 1;
  return diff >= MIN_SUBSTANTIVE_EDIT_CHARS || retentionRatio < 0.7;
}

export async function getVoiceContext(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from("brand_voice_examples")
    .select("text")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(MAX_VOICE_EXAMPLES);

  if (!data || data.length < 2) return "";

  return `
EXAMPLES OF THIS BUSINESS'S ACTUAL VOICE (match this tone, phrasing style, and energy —
these are real approved posts from this business, not generic examples):
${data.map((d, i) => `${i + 1}. "${d.text}"`).join("\n")}
`;
}
