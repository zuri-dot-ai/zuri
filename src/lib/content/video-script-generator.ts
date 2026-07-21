import { geminiJSON } from "@/lib/gemini";
import { createServiceClient } from "@/lib/supabase/service";
import { sanitizeForPrompt } from "@/lib/utils/sanitize";
import { generateImageWithSafetyRetry } from "./imagen";
import { uploadImageToStorage } from "./image-storage";
import { sanitizeImagePrompt } from "./image-prompt-generator";
import type { GenerationInput, VideoScript } from "./types";

export async function generateVideoScript(
  input: GenerationInput
): Promise<VideoScript> {
  const durationMap: Record<string, number> = {
    reel: 30,
    short_video: 60,
    video: 60,
  };
  const duration = durationMap[input.formatType] ?? 30;

  const businessName = sanitizeForPrompt(input.brand.business_name);
  const industry = sanitizeForPrompt(input.brand.industry);
  const topic = sanitizeForPrompt(input.topic);
  const brief = sanitizeForPrompt(input.brief);
  const brandTone = sanitizeForPrompt(input.brand.brand_tone);
  const audience = sanitizeForPrompt(input.brand.target_audience);

  const prompt = `
You are a video content director for ${businessName} (${industry}, Nigeria).
Create a complete ${duration}-second video script for ${input.platform}.

Topic: ${topic}
Brief: ${brief}
Brand tone: ${brandTone}
Audience: ${audience}

Video script rules:
- Hook: the first 3 seconds must make someone stop scrolling — be bold
- Total duration: exactly ${duration} seconds
- Pacing: ${duration <= 30 ? "very fast — every second counts" : "energetic but with breathing room"}
- Style: choose one: "talking head" | "product showcase" | "B-roll montage" | "text-on-screen"
  Choose the style that best fits this business type and topic
- No copyrighted music references
- Nigerian context: reference local culture, slang (sparingly), or environment where natural
- Thumbnail: describe a compelling static frame from the video that would make people click

Output ONLY valid JSON:
{
  "hook_line": "First spoken or text line (max 10 words)",
  "hook_visual": "What the camera shows in the first 3 seconds",
  "body_beats": [
    {
      "time_seconds": 4,
      "spoken_text": "What is said",
      "visual_direction": "What the viewer sees",
      "text_overlay": "Optional on-screen text"
    }
  ],
  "cta": "Final CTA line (max 8 words)",
  "cta_visual": "What shows during the CTA",
  "thumbnail_prompt": "Imagen image prompt for the thumbnail — no faces, no text, specific and cinematic",
  "total_duration_seconds": ${duration},
  "video_style": "talking head",
  "caption_for_post": "Social media caption to accompany this video",
  "hashtags": ["#hashtag1", "#hashtag2"]
}
`;

  const script = await geminiJSON<VideoScript>(prompt, "flash");
  script.status = "script_ready";
  script.total_duration_seconds = duration;

  try {
    const thumbPrompt = sanitizeImagePrompt(script.thumbnail_prompt ?? "");
    const result = await generateImageWithSafetyRetry(
      thumbPrompt ||
        "Cinematic product still, soft light, no people, no text, African textures",
      "9:16"
    );
    if (result.base64) {
      const supabase = createServiceClient();
      script.thumbnail_url = await uploadImageToStorage(
        supabase,
        input.userId,
        result.base64,
        "thumbnail"
      );
    }
  } catch (err) {
    console.warn("Thumbnail generation failed:", err);
  }

  return script;
}
