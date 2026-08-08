import { geminiJSON } from "@/lib/gemini";
import { createServiceClient } from "@/lib/supabase/service";
import { sanitizeForPrompt, sanitizeText } from "@/lib/utils/sanitize";
import { CAPTION_RULES, type CaptionRule } from "./caption-rules";
import {
  formatContentProfileForPrompt,
  parseContentProfile,
  type ContentProfile,
} from "./content-profile";
import type { GenerationInput, PlatformVariants } from "./types";
import { getVoiceContext } from "./voice-bank";

function normalizeVariants(
  raw: unknown,
  fallbackCaption: string,
  fallbackHashtags: string[]
): PlatformVariants {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const ig =
    obj.instagram && typeof obj.instagram === "object"
      ? (obj.instagram as Record<string, unknown>)
      : {};
  const wa =
    obj.whatsapp && typeof obj.whatsapp === "object"
      ? (obj.whatsapp as Record<string, unknown>)
      : {};
  const x =
    obj.x && typeof obj.x === "object"
      ? (obj.x as Record<string, unknown>)
      : {};

  const igTags = Array.isArray(ig.hashtags)
    ? ig.hashtags
        .map((h) => sanitizeHashtag(String(h)))
        .filter((h) => h.length >= 2)
        .slice(0, 7)
    : fallbackHashtags.slice(0, 7);

  const igCaption = sanitizeText(String(ig.caption ?? fallbackCaption));
  const waCaption = sanitizeText(
    String(wa.caption ?? fallbackCaption).slice(0, 400)
  );
  let xCaption = sanitizeText(String(x.caption ?? fallbackCaption));
  if (xCaption.length > 280) xCaption = xCaption.slice(0, 277) + "...";

  return {
    instagram: {
      caption: igCaption || fallbackCaption,
      hashtags: igTags.length > 0 ? igTags : fallbackHashtags.slice(0, 7),
    },
    whatsapp: { caption: waCaption || fallbackCaption },
    x: { caption: xCaption || fallbackCaption.slice(0, 280) },
  };
}

function profileBlockFromBrand(brand: GenerationInput["brand"]): string {
  const raw = brand as Record<string, unknown>;
  const profile: ContentProfile =
    raw.content_profile &&
    typeof raw.content_profile === "object" &&
    "primary_tone" in (raw.content_profile as object)
      ? (raw.content_profile as ContentProfile)
      : parseContentProfile(raw.content_profile, {
          brand_tone: brand.brand_tone,
          target_audience: brand.target_audience,
          services: brand.services,
        });
  return formatContentProfileForPrompt(profile);
}

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
${profileBlockFromBrand(input.brand)}
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
- Mix broad reach tags with niche/local Nigerian tags (e.g. #NaijaBusinesses #MadeInNigeria)
- Weave 1-2 hashtags naturally into the caption body when it reads well; list the full set in the hashtags array
- Hashtags must start with # and contain only letters and numbers after the #
- No spaces inside hashtags

COPY RULES:
1. The very first line must be the hook — use the hook provided as inspiration but make it your own
2. Mention ${businessName} or refer to "we/us" — not generic third person
3. Nigerian voice: natural, warm, culturally aware — not stiff corporate copy
4. No placeholder text, no [brackets], no lorem ipsum
5. End with a specific CTA — not just "contact us"
6. Also produce three platform variants of the SAME idea (not three different topics)

Output ONLY valid JSON:
{
  "caption": "full post caption for the primary platform (${input.platform})",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "variants": {
    "instagram": {
      "caption": "Instagram caption with natural hashtag integration",
      "hashtags": ["#tag1", "#tag2", "#tag3"]
    },
    "whatsapp": {
      "caption": "Shorter WhatsApp Status/Broadcast version — direct, no hashtags"
    },
    "x": {
      "caption": "Punchy X/Twitter version under 280 characters"
    }
  }
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
${profileBlockFromBrand(input.brand)}
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
${profileBlockFromBrand(input.brand)}
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
${profileBlockFromBrand(input.brand)}
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
): Promise<{
  caption: string;
  hashtags: string[];
  variants: PlatformVariants;
}> {
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

  // Special formats still need cross-platform variants of the core idea
  if (isThread || isPoll || isArticle) {
    captionPrompt += `

Also include variants of the same idea:
"variants": {
  "instagram": { "caption": "...", "hashtags": ["#a","#b","#c"] },
  "whatsapp": { "caption": "short direct status, no hashtags" },
  "x": { "caption": "under 280 chars" }
}`;
  }

  const result = await geminiJSON<{
    caption: string;
    hashtags: string[];
    thread_posts?: string[];
    poll_options?: string[];
    article_body?: string;
    poll_question?: string;
    variants?: unknown;
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
    const retry = await geminiJSON<{
      caption: string;
      hashtags: string[];
      variants?: unknown;
    }>(
      captionPrompt +
        "\n\nCRITICAL: Do NOT use placeholder text, brackets, or lorem ipsum.",
      "flash"
    );
    finalCaption = sanitizeText(retry.caption ?? finalCaption);
    result.hashtags = retry.hashtags ?? result.hashtags;
    result.variants = retry.variants ?? result.variants;
  }

  if (finalCaption.length > rules.max_chars) {
    finalCaption = finalCaption.slice(0, rules.max_chars - 3) + "...";
  }

  const cleanHashtags = (result.hashtags ?? [])
    .map((h) => sanitizeHashtag(h))
    .filter((h) => h.length >= 2 && h.length <= 30)
    .slice(0, rules.hashtag_count.max);

  const variants = normalizeVariants(
    result.variants,
    finalCaption,
    cleanHashtags
  );

  // When primary platform is Instagram, prefer variant IG tags if richer
  const hashtags =
    input.platform === "instagram" && variants.instagram.hashtags.length > 0
      ? variants.instagram.hashtags.slice(0, rules.hashtag_count.max)
      : cleanHashtags;

  return { caption: finalCaption, hashtags, variants };
}