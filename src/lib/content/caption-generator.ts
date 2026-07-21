import { geminiJSON } from "@/lib/gemini";
import { createServiceClient } from "@/lib/supabase/service";
import { sanitizeForPrompt, sanitizeText } from "@/lib/utils/sanitize";
import { CAPTION_RULES, type CaptionRule } from "./caption-rules";
import type { GenerationInput } from "./types";
import { getVoiceContext } from "./voice-bank";

export function sanitizeHashtag(tag: string): string {
  const clean = tag.replace(/^#+/, "").replace(/[^a-zA-Z0-9]/g, "");
  return clean.length >= 2 ? `#${clean}` : "";
}

export function buildStandardCaptionPrompt(
  input: GenerationInput,
  rules: CaptionRule,
  imageUrl?: string,
  voiceContext = ""
): string {
  const businessName = sanitizeForPrompt(input.brand.business_name);
  const industry = sanitizeForPrompt(input.brand.industry);
  const topic = sanitizeForPrompt(input.topic);
  const hook = sanitizeForPrompt(input.hook);
  const brief = sanitizeForPrompt(input.brief);
  const brandTone = sanitizeForPrompt(input.brand.brand_tone);

  return `
You are a social media copywriter for ${businessName}, a ${industry} business in Nigeria.

Write a ${input.platform} post about: ${topic}
Hook: ${hook}
Brief: ${brief}
Brand tone: ${brandTone}
${voiceContext}
${imageUrl ? "There is an image accompanying this post. Write copy that complements a visual." : "This is a text-only post."}

PLATFORM RULES FOR ${input.platform.toUpperCase()}:
- Max caption length: ${rules.recommended_chars} characters (hard limit: ${rules.max_chars})
- Tone: ${rules.tone}
- CTA style: ${rules.cta_style}
- Emoji usage: ${rules.emoji_usage}
- Structure: ${rules.structure}

HASHTAG RULES:
- Generate exactly ${rules.hashtag_count.min}-${rules.hashtag_count.max} hashtags
- Mix: 5 niche (very specific), 5-10 mid-range (industry), 5 broad (wide reach)
- Always include at least 2 Nigerian/African hashtags where relevant
  (e.g. #NaijaBusinesses #LagosFood #NigerianFashion #MadeInNigeria)
- Hashtags must start with # and contain only letters and numbers after the #
- No spaces inside hashtags

COPY RULES:
1. The very first line must be the hook — use the hook provided as inspiration but make it your own
2. Mention ${businessName} or refer to "we/us" — not generic third person
3. Nigerian voice: natural, warm, culturally aware — not stiff corporate copy
4. No placeholder text, no [brackets], no lorem ipsum
5. End with a specific CTA — not just "contact us"

Output ONLY valid JSON:
{
  "caption": "full post caption here",
  "hashtags": ["#hashtag1", "#hashtag2"]
}
`;
}

export function buildThreadPrompt(
  input: GenerationInput,
  rules: CaptionRule,
  voiceContext = ""
): string {
  const businessName = sanitizeForPrompt(input.brand.business_name);
  const topic = sanitizeForPrompt(input.topic);
  const brief = sanitizeForPrompt(input.brief);
  const brandTone = sanitizeForPrompt(input.brand.brand_tone);

  return `
Write an X (Twitter) thread for ${businessName} about: ${topic}
Brief: ${brief}
Brand tone: ${brandTone}
${voiceContext}
Thread rules:
- 4-6 posts in the thread
- Each post max 250 characters
- Post 1: Strong hook that makes people want to read on (must stand alone as a complete tweet)
- Posts 2-5: Each one insight, fact, or story beat — short and punchy
- Last post: CTA or summary
- Number each with (1/6), (2/6) etc.
- Max hashtags: ${rules.hashtag_count.max}

Output ONLY valid JSON:
{
  "caption": "Post 1 (hook tweet) — this is what shows in the feed",
  "thread_posts": ["(1/6) hook tweet", "(2/6) second tweet"],
  "hashtags": ["#tag1", "#tag2"]
}
`;
}

export function buildPollPrompt(
  input: GenerationInput,
  voiceContext = ""
): string {
  const businessName = sanitizeForPrompt(input.brand.business_name);
  const topic = sanitizeForPrompt(input.topic);
  const brief = sanitizeForPrompt(input.brief);
  const audience = sanitizeForPrompt(input.brand.target_audience);
  const brandTone = sanitizeForPrompt(input.brand.brand_tone);

  return `
Write a ${input.platform} poll for ${businessName} about: ${topic}
Brief: ${brief}
Brand tone: ${brandTone}
${voiceContext}
The poll should be engaging and relevant to the audience: ${audience}

Rules:
- Poll question: max 140 characters, genuinely interesting to the audience
- 4 poll options: each max 25 characters, clear and distinct
- Short intro caption: 1-2 sentences before the poll question
- Make it fun — polls work because they are interactive and opinionated

Output ONLY valid JSON:
{
  "caption": "short intro caption",
  "poll_question": "the poll question",
  "poll_options": ["Option A", "Option B", "Option C", "Option D"],
  "hashtags": ["#tag1", "#tag2"]
}
`;
}

export function buildLinkedInArticlePrompt(
  input: GenerationInput,
  voiceContext = ""
): string {
  const businessName = sanitizeForPrompt(input.brand.business_name);
  const topic = sanitizeForPrompt(input.topic);
  const brief = sanitizeForPrompt(input.brief);
  const brandTone = sanitizeForPrompt(input.brand.brand_tone);
  const audience = sanitizeForPrompt(input.brand.target_audience);

  return `
Write a LinkedIn article for ${businessName} about: ${topic}
Brief: ${brief}
Brand tone: ${brandTone} (professional adaptation)
${voiceContext}
Target audience: ${audience}

Article rules:
- Headline: compelling, SEO-aware, max 100 characters
- Body: 400-600 words, structured with 3-4 sections
- Tone: professional, first-person (use "I" or "we"), insights-focused
- End with a thought-provoking question or CTA
- Must feel Nigerian/African — reference local business context

Output ONLY valid JSON:
{
  "caption": "LinkedIn post teaser (150 chars) — hooks people to click the article",
  "article_body": "Full article in markdown format",
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}
`;
}

export async function generateCaption(
  input: GenerationInput,
  imageUrl?: string
): Promise<{ caption: string; hashtags: string[] }> {
  const rules = CAPTION_RULES[input.platform];
  if (!rules) throw new Error(`Unknown platform: ${input.platform}`);

  let voiceContext = "";
  try {
    const supabase = createServiceClient();
    voiceContext = await getVoiceContext(supabase, input.userId);
  } catch (err) {
    console.error("[generateCaption] voice context failed:", err);
  }

  const isThread = input.formatType === "thread";
  const isPoll = input.formatType === "poll";
  const isArticle = input.formatType === "article";

  let captionPrompt: string;
  if (isThread) {
    captionPrompt = buildThreadPrompt(input, rules, voiceContext);
  } else if (isPoll) {
    captionPrompt = buildPollPrompt(input, voiceContext);
  } else if (isArticle) {
    captionPrompt = buildLinkedInArticlePrompt(input, voiceContext);
  } else {
    captionPrompt = buildStandardCaptionPrompt(
      input,
      rules,
      imageUrl,
      voiceContext
    );
  }

  if (process.env.NODE_ENV === "development" && voiceContext) {
    console.log(
      "[generateCaption] voice context injected:",
      voiceContext.slice(0, 200)
    );
  }

  const result = await geminiJSON<{
    caption: string;
    hashtags: string[];
    thread_posts?: string[];
    poll_options?: string[];
    article_body?: string;
    poll_question?: string;
  }>(captionPrompt, "flash");

  let finalCaption = sanitizeText(result.caption ?? "");

  if (isThread && result.thread_posts?.length) {
    finalCaption = result.thread_posts.map((p) => sanitizeText(p)).join("\n\n");
  } else if (isPoll && result.poll_question) {
    const options = (result.poll_options ?? [])
      .map((o) => sanitizeText(o))
      .join(" | ");
    finalCaption = `${sanitizeText(result.caption ?? "")}\n\n${sanitizeText(result.poll_question)}\n${options}`;
  } else if (isArticle && result.article_body) {
    finalCaption = `${sanitizeText(result.caption ?? "")}\n\n${sanitizeText(result.article_body)}`;
  }

  if (/\[.*?\]|lorem ipsum|placeholder/i.test(finalCaption)) {
    const retry = await geminiJSON<{ caption: string; hashtags: string[] }>(
      captionPrompt +
        "\n\nCRITICAL: Do NOT use placeholder text, brackets, or lorem ipsum.",
      "flash"
    );
    finalCaption = sanitizeText(retry.caption ?? finalCaption);
    result.hashtags = retry.hashtags ?? result.hashtags;
  }

  if (finalCaption.length > rules.max_chars) {
    finalCaption = finalCaption.slice(0, rules.max_chars - 3) + "...";
  }

  const cleanHashtags = (result.hashtags ?? [])
    .map((h) => sanitizeHashtag(h))
    .filter((h) => h.length >= 2 && h.length <= 30)
    .slice(0, rules.hashtag_count.max);

  return { caption: finalCaption, hashtags: cleanHashtags };
}
