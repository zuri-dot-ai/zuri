# ZURI — CONTENT GENERATION SYSTEM
# Complete specification for AI image generation (Imagen), caption writing,
# blog posts, email newsletters, and video (coming soon placeholder)

---

## 1. SYSTEM OVERVIEW

Content Generation is the execution layer that sits beneath Content Strategy. Where the Strategy system produces BRIEFS (what to say and when), this system produces the ACTUAL CONTENT — the image, the caption, the blog post, the newsletter.

### Relationship to Content Strategy

```
Content Strategy (03_CONTENT_STRATEGY.md)
  └── CalendarSlot { topic, hook, brief, platform, format_type }
        ↓ User clicks "Generate"
Content Generation (this file)
  ├── Step 1: Generate image prompt (Gemini Flash)
  ├── Step 2: Generate image (Imagen 3)
  ├── Step 3: Generate caption + hashtags (Gemini Flash)
  └── Step 4: Save to generated_content → return to user

OR — Standalone (no calendar slot required)
  └── User provides topic + platform → same pipeline
```

### Content Types by Format

| Format Type | Produces | Image? | Video? |
|---|---|---|---|
| static_image | Caption + image | Yes | No |
| carousel | Caption + 3-5 image prompts | Yes (multiple) | No |
| story | Caption + image | Yes | No |
| text_post | Caption only | No | No |
| article | Full LinkedIn article | No | No |
| thread | Thread breakdown (X) | No | No |
| poll | Poll question + options | No | No |
| blog_post | Full blog post | No | No |
| newsletter | Full newsletter structure | No | No |
| reel | Video script + thumbnail prompt | Thumbnail only | Coming soon |
| short_video | Video script + thumbnail prompt | Thumbnail only | Coming soon |

---

## 2. GENERATION PIPELINE

### 2.1 Main Entry Point

```typescript
// src/lib/content/generation-pipeline.ts

export interface GenerationInput {
  userId: string;
  calendarSlotId?: string;            // Optional — if generating from a slot
  platform: string;
  formatType: string;
  topic: string;
  hook: string;
  brief: string;
  brand: BusinessProfile;
  archetype: DesignArchetype;
}

export interface GenerationOutput {
  id: string;                          // generated_content.id
  platform: string;
  formatType: string;
  caption?: string;
  hashtags?: string[];
  imageUrl?: string;
  imagePromptUsed?: string;
  blogContent?: BlogContent;
  newsletterContent?: NewsletterContent;
  videoScript?: VideoScript;
  status: "ready" | "partial" | "failed";
  warnings: string[];
}

export async function runGenerationPipeline(
  input: GenerationInput
): Promise<GenerationOutput> {

  const supabase = createServiceClient();
  const warnings: string[] = [];
  let imageUrl: string | undefined;
  let imagePromptUsed: string | undefined;
  let caption: string | undefined;
  let hashtags: string[] = [];
  let blogContent: BlogContent | undefined;
  let newsletterContent: NewsletterContent | undefined;
  let videoScript: VideoScript | undefined;

  const isImageFormat = IMAGE_FORMATS.has(input.formatType);
  const isVideoFormat = VIDEO_FORMATS.has(input.formatType);
  const isBlogFormat = input.formatType === "blog_post";
  const isNewsletterFormat = input.formatType === "newsletter";
  const isTextFormat = TEXT_ONLY_FORMATS.has(input.formatType);

  // ── Image Generation ────────────────────────────────────────────────────────
  if (isImageFormat) {
    try {
      imagePromptUsed = await generateImagePrompt(input);
      imageUrl = await generateImage(imagePromptUsed, getAspectRatio(input.platform, input.formatType));
      imageUrl = await uploadImageToStorage(supabase, input.userId, imageUrl, input.formatType);
    } catch (err) {
      console.error("Image generation failed:", err);
      warnings.push("Image generation failed. You can upload or search for an image manually.");
      // Do not fail the whole pipeline — proceed without image
    }
  }

  // ── Video (Coming Soon) ─────────────────────────────────────────────────────
  if (isVideoFormat) {
    videoScript = await generateVideoScript(input);
    warnings.push("Video generation is coming soon. Your script is ready for when Higgsfield launches.");
  }

  // ── Blog Post ───────────────────────────────────────────────────────────────
  if (isBlogFormat) {
    blogContent = await generateBlogPost(input);
  }

  // ── Newsletter ───────────────────────────────────────────────────────────────
  if (isNewsletterFormat) {
    newsletterContent = await generateNewsletter(input);
  }

  // ── Caption + Hashtags (all social formats) ─────────────────────────────────
  if (!isBlogFormat && !isNewsletterFormat) {
    const { caption: cap, hashtags: tags } = await generateCaption(input, imageUrl);
    caption = cap;
    hashtags = tags;
  }

  // ── Save to DB ───────────────────────────────────────────────────────────────
  const { data: saved } = await supabase.from("generated_content").insert({
    user_id: input.userId,
    calendar_slot_id: input.calendarSlotId ?? null,
    platform: input.platform,
    format_type: input.formatType,
    caption,
    hashtags,
    image_url: imageUrl ?? null,
    image_prompt_used: imagePromptUsed ?? null,
    blog_content: blogContent ?? null,
    newsletter_content: newsletterContent ?? null,
    video_script: videoScript ?? null,
    status: warnings.length > 0 ? "partial" : "ready",
  }).select().single();

  // Update calendar slot status if this was triggered from a slot
  if (input.calendarSlotId && saved) {
    await supabase.from("content_calendar").update({
      status: "generated",
      content_id: saved.id,
      updated_at: new Date().toISOString(),
    }).eq("id", input.calendarSlotId);
  }

  // Increment usage counter for image
  if (imageUrl) {
    await supabase.rpc("increment_usage", {
      p_user_id: input.userId,
      p_metric: "images_generated",
    });
  }

  // Increment usage for blog
  if (blogContent) {
    await supabase.rpc("increment_usage", {
      p_user_id: input.userId,
      p_metric: "blog_posts_generated",
    });
  }

  // Increment usage for newsletter
  if (newsletterContent) {
    await supabase.rpc("increment_usage", {
      p_user_id: input.userId,
      p_metric: "newsletters_generated",
    });
  }

  return {
    id: saved?.id ?? "",
    platform: input.platform,
    formatType: input.formatType,
    caption,
    hashtags,
    imageUrl,
    imagePromptUsed,
    blogContent,
    newsletterContent,
    videoScript,
    status: warnings.length > 0 ? "partial" : "ready",
    warnings,
  };
}

// Format classification constants
const IMAGE_FORMATS = new Set(["static_image", "carousel", "story"]);
const VIDEO_FORMATS = new Set(["reel", "short_video"]);
const TEXT_ONLY_FORMATS = new Set(["text_post", "article", "thread", "poll"]);
```

---

## 3. IMAGE GENERATION (IMAGEN 3)

This is the cornerstone of the generation system. Imagen 3 is used — not Stability AI or Midjourney — because it is Google's model and central to the GeminiXprize submission.

### 3.1 Aspect Ratios by Platform and Format

```typescript
// src/lib/content/image-dimensions.ts

export function getAspectRatio(
  platform: string,
  formatType: string
): "1:1" | "4:5" | "16:9" | "9:16" | "3:4" {
  const map: Record<string, Record<string, string>> = {
    instagram: {
      static_image: "4:5",      // 1080×1350 — best reach in feed
      carousel: "1:1",          // 1080×1080 — standard for carousels
      story: "9:16",            // 1080×1920 — full screen
      reel: "9:16",
    },
    facebook: {
      static_image: "1:1",     // 1200×1200
      story: "9:16",
      default: "16:9",          // 1200×630
    },
    linkedin: {
      static_image: "1:1",
      article: "16:9",
      default: "16:9",
    },
    x: {
      static_image: "16:9",    // 1200×675
      default: "1:1",
    },
    tiktok: {
      short_video: "9:16",
    },
  };

  return (map[platform]?.[formatType] ?? map[platform]?.["default"] ?? "1:1") as any;
}

export function getPixelDimensions(aspectRatio: string): { width: number; height: number } {
  const dimensions: Record<string, { width: number; height: number }> = {
    "1:1":  { width: 1080, height: 1080 },
    "4:5":  { width: 1080, height: 1350 },
    "16:9": { width: 1200, height: 675 },
    "9:16": { width: 1080, height: 1920 },
    "3:4":  { width: 1080, height: 1440 },
  };
  return dimensions[aspectRatio] ?? { width: 1080, height: 1080 };
}
```

### 3.2 Image Prompt Generator (Gemini Flash)

The image prompt is generated by Gemini first, then passed to Imagen. This two-step approach gives us full control over what Imagen receives and prevents prompt injection from user input.

```typescript
// src/lib/content/image-prompt-generator.ts

export async function generateImagePrompt(input: GenerationInput): Promise<string> {
  const spec = ARCHETYPES[input.archetype];
  const aspectRatio = getAspectRatio(input.platform, input.formatType);
  const isPortrait = aspectRatio === "4:5" || aspectRatio === "9:16";

  const prompt = `
You are a professional art director creating an image prompt for AI image generation.
The image is for a Nigerian ${input.brand.industry} business called "${input.brand.business_name}".

Content topic: ${input.topic}
Content brief: ${input.brief}
Platform: ${input.platform}
Format: ${input.formatType}
Aspect ratio: ${aspectRatio} (${isPortrait ? "portrait/vertical composition" : "landscape/square composition"})
Visual style keywords: ${spec.image_style_keywords.join(", ")}
Location context: ${spec.image_location_keywords.join(", ")}

Generate a detailed, specific image generation prompt. Output ONLY the prompt text — no explanation, no preamble.

STRICT RULES for the prompt you write:
- NEVER include human faces or identifiable people
- NEVER include brand logos, text, words, or numbers in the image
- NEVER include anything explicit, violent, or offensive
- ALWAYS include specific lighting description (e.g. "soft diffused natural light", "golden hour warm light")
- ALWAYS include composition direction (e.g. "flat lay", "close-up macro", "wide establishing shot")
- ALWAYS include mood and atmosphere (e.g. "warm and inviting", "sleek and minimal", "bold and energetic")
- INCLUDE African/Nigerian visual context where it enhances authenticity (textures, colours, environments)
- Style: photorealistic, high quality, professional photography — NOT illustrated or cartoon
  ${input.archetype === "portfolio-dramatic" ? "(exception: dramatic cinematic lighting is encouraged)" : ""}
- Keep the prompt under 150 words
`;

  const rawPrompt = await geminiGenerate(prompt, "gemini-1.5-flash");
  return sanitizeImagePrompt(rawPrompt.trim());
}

// Strip any user-injected content that might have leaked into the prompt
function sanitizeImagePrompt(prompt: string): string {
  return prompt
    .replace(/<[^>]*>/g, "")              // Strip HTML
    .replace(/ignore previous/gi, "")     // Prompt injection attempt
    .replace(/ignore all instructions/gi, "")
    .replace(/you are now/gi, "")
    .replace(/\bSEX\b|\bNUDE\b|\bNAKED\b/gi, "")  // Safety
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);                        // Hard cap
}
```

### 3.3 Imagen 3 API Call

```typescript
// src/lib/content/imagen.ts

export async function generateImage(
  imagePrompt: string,
  aspectRatio: "1:1" | "4:5" | "16:9" | "9:16" | "3:4"
): Promise<string> { // returns base64 string

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: imagePrompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio,
          safetyFilterLevel: "block_most",
          personGeneration: "dont_allow",  // No faces/people
        },
      }),
      signal: AbortSignal.timeout(60000), // 60 second timeout — Imagen can be slow
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Imagen API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();

  // Check for blocked content
  if (data.predictions?.[0]?.raiFilteredReason) {
    throw new ImageSafetyError(
      `Image blocked by safety filter: ${data.predictions[0].raiFilteredReason}`
    );
  }

  const base64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!base64) throw new Error("Imagen returned no image data");

  return base64;
}

export class ImageSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageSafetyError";
  }
}
```

### 3.4 Upload Image to Supabase Storage

```typescript
// src/lib/content/image-storage.ts

export async function uploadImageToStorage(
  supabase: SupabaseClient,
  userId: string,
  base64Image: string,
  formatType: string
): Promise<string> {

  const buffer = Buffer.from(base64Image, "base64");

  // Validate size — Imagen produces ~1-3MB images
  if (buffer.byteLength > 10 * 1024 * 1024) {
    throw new Error("Generated image exceeds 10MB storage limit");
  }

  const fileName = `${userId}/generated/${formatType}-${Date.now()}.jpg`;

  const { data, error } = await supabase.storage
    .from("generated-images")
    .upload(fileName, buffer, {
      contentType: "image/jpeg",
      upsert: false,
      cacheControl: "31536000", // 1 year cache
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from("generated-images")
    .getPublicUrl(data.path);

  return publicUrl;
}
```

### 3.5 Carousel Image Generation

For carousel posts, generate 3–5 images from related prompts with a consistent visual theme.

```typescript
export async function generateCarouselImages(
  input: GenerationInput,
  slideCount: number = 4
): Promise<string[]> {

  // First generate a visual theme prompt (consistent across all slides)
  const themePrompt = await geminiGenerate(`
Create a short visual style guide (2 sentences max) for a ${slideCount}-slide carousel post.
Business: ${input.brand.business_name} (${input.brand.industry})
Topic: ${input.topic}
The style must be consistent across all ${slideCount} slides.
Describe: colour palette, lighting style, and compositional approach.
Output ONLY the style guide text.
`, "gemini-1.5-flash");

  // Generate individual slide prompts
  const slidesPrompt = `
Create ${slideCount} individual image prompts for a carousel about: ${input.topic}
Business: ${input.brand.business_name}
Visual theme for all slides: ${themePrompt}

Each slide must be different but visually cohesive.
Output ONLY valid JSON: { "slides": ["prompt1", "prompt2", "prompt3", "prompt4"] }
`;

  const { slides } = await geminiJSON<{ slides: string[] }>(slidesPrompt, "flash");

  // Generate all images in parallel
  const imageResults = await Promise.allSettled(
    slides.map(slidePrompt =>
      generateImage(sanitizeImagePrompt(slidePrompt), "1:1")
    )
  );

  // Filter out failures — a carousel can work with fewer slides if some fail
  const successfulBase64 = imageResults
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map(r => r.value);

  if (successfulBase64.length < 2) {
    throw new Error("Could not generate enough carousel images");
  }

  // Upload all
  const urls = await Promise.all(
    successfulBase64.map(b64 => uploadImageToStorage(createServiceClient(), "", b64, "carousel"))
  );

  return urls;
}
```

---

## 4. CAPTION GENERATION

### 4.1 Platform-Specific Caption Rules

```typescript
// src/lib/content/caption-rules.ts

export const CAPTION_RULES: Record<string, CaptionRule> = {
  instagram: {
    max_chars: 2200,
    recommended_chars: 150,          // ~125 chars shown before "more"
    tone: "visual-first, conversational, emoji-friendly",
    cta_style: "end with a question or direct call to action",
    hashtag_count: { min: 15, max: 25 },
    hashtag_position: "end",          // after the caption, separated by a line break
    emoji_usage: "encouraged — 2-4 emojis to add energy",
    structure: "Hook line → 2-3 sentences → CTA → line break → hashtags",
  },
  facebook: {
    max_chars: 63206,                 // Facebook's limit
    recommended_chars: 250,
    tone: "conversational, storytelling, community-focused",
    cta_style: "ask a question or invite comments",
    hashtag_count: { min: 0, max: 3 },
    hashtag_position: "inline or end",
    emoji_usage: "light — 1-2 emojis maximum",
    structure: "Hook → story or context (2-4 sentences) → CTA",
  },
  linkedin: {
    max_chars: 3000,
    recommended_chars: 300,
    tone: "professional, insights-driven, first-person narrative",
    cta_style: "invite thoughts or professional discussion",
    hashtag_count: { min: 3, max: 5 },
    hashtag_position: "end",
    emoji_usage: "very light or none — use sparingly for emphasis only",
    structure: "Bold opening statement → insight or story (3-4 short paragraphs) → professional CTA → hashtags",
  },
  x: {
    max_chars: 280,
    recommended_chars: 220,           // Leave room for potential link
    tone: "punchy, opinionated, direct, conversational",
    cta_style: "provocative question or bold statement that invites replies",
    hashtag_count: { min: 0, max: 2 },
    hashtag_position: "inline",
    emoji_usage: "optional — 1 max",
    structure: "Strong hook (the whole post IS the hook — no preamble)",
  },
  tiktok: {
    max_chars: 2200,
    recommended_chars: 100,
    tone: "casual, energetic, trend-aware",
    cta_style: "follow, comment, duet, or stitch",
    hashtag_count: { min: 3, max: 10 },
    hashtag_position: "end",
    emoji_usage: "encouraged — 2-5 emojis",
    structure: "Hook → 1-2 sentences → CTA → hashtags",
  },
};
```

### 4.2 Caption Generation (Gemini Flash)

```typescript
// src/lib/content/caption-generator.ts

export async function generateCaption(
  input: GenerationInput,
  imageUrl?: string
): Promise<{ caption: string; hashtags: string[] }> {

  const rules = CAPTION_RULES[input.platform];
  if (!rules) throw new Error(`Unknown platform: ${input.platform}`);

  const isThread = input.formatType === "thread";
  const isPoll = input.formatType === "poll";
  const isArticle = input.formatType === "article";

  let captionPrompt: string;

  if (isThread) {
    captionPrompt = buildThreadPrompt(input, rules);
  } else if (isPoll) {
    captionPrompt = buildPollPrompt(input);
  } else if (isArticle) {
    captionPrompt = buildLinkedInArticlePrompt(input);
  } else {
    captionPrompt = buildStandardCaptionPrompt(input, rules, imageUrl);
  }

  const result = await geminiJSON<{
    caption: string;
    hashtags: string[];
    thread_posts?: string[];   // For X threads
    poll_options?: string[];   // For polls
    article_body?: string;     // For LinkedIn articles
  }>(captionPrompt, "flash");

  // Post-process caption
  let finalCaption = sanitizeText(result.caption ?? "");

  // Enforce character limit
  if (finalCaption.length > rules.max_chars) {
    finalCaption = finalCaption.slice(0, rules.max_chars - 3) + "...";
  }

  // Validate hashtags
  const cleanHashtags = (result.hashtags ?? [])
    .map(h => sanitizeHashtag(h))
    .filter(h => h.length >= 2 && h.length <= 30)
    .slice(0, rules.hashtag_count.max);

  return { caption: finalCaption, hashtags: cleanHashtags };
}

function buildStandardCaptionPrompt(
  input: GenerationInput,
  rules: CaptionRule,
  imageUrl?: string
): string {
  return `
You are a social media copywriter for ${input.brand.business_name}, a ${input.brand.industry} business in Nigeria.

Write a ${input.platform} post about: ${input.topic}
Hook: ${input.hook}
Brief: ${input.brief}
Brand tone: ${input.brand.brand_tone}
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
2. Mention ${input.brand.business_name} or refer to "we/us" — not generic third person
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

function buildThreadPrompt(input: GenerationInput, rules: CaptionRule): string {
  return `
Write an X (Twitter) thread for ${input.brand.business_name} about: ${input.topic}
Brief: ${input.brief}
Brand tone: ${input.brand.brand_tone}

Thread rules:
- 4-6 posts in the thread
- Each post max 250 characters
- Post 1: Strong hook that makes people want to read on (must stand alone as a complete tweet)
- Posts 2-5: Each one insight, fact, or story beat — short and punchy
- Last post: CTA or summary
- Number each with (1/6), (2/6) etc.

Output ONLY valid JSON:
{
  "caption": "Post 1 (hook tweet) — this is what shows in the feed",
  "thread_posts": ["(1/6) hook tweet", "(2/6) second tweet", ...],
  "hashtags": ["#tag1", "#tag2"]
}
`;
}

function buildPollPrompt(input: GenerationInput): string {
  return `
Write a ${input.platform} poll for ${input.brand.business_name} about: ${input.topic}
Brief: ${input.brief}

The poll should be engaging and relevant to the audience: ${input.brand.target_audience}

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

function buildLinkedInArticlePrompt(input: GenerationInput): string {
  return `
Write a LinkedIn article for ${input.brand.business_name} about: ${input.topic}
Brief: ${input.brief}
Brand tone: ${input.brand.brand_tone} (professional adaptation)
Target audience: ${input.brand.target_audience}

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

// Sanitize a hashtag — strip everything except letters, numbers, and the leading #
function sanitizeHashtag(tag: string): string {
  const clean = tag.replace(/^#+/, "").replace(/[^a-zA-Z0-9]/g, "");
  return clean.length >= 2 ? `#${clean}` : "";
}
```

---

## 5. BLOG POST GENERATION

### 5.1 Blog Post Structure

```typescript
export interface BlogContent {
  title: string;                     // SEO-optimized, max 70 chars
  meta_description: string;          // Max 155 chars
  introduction: string;              // 100-150 words
  sections: BlogSection[];           // 3-5 sections
  conclusion: string;                // 80-120 words
  cta: { text: string; button_label: string };
  suggested_tags: string[];          // 3-5 keyword tags
  reading_time_minutes: number;
  word_count: number;
}

export interface BlogSection {
  heading: string;                   // H2
  content: string;                   // 200-300 words
  subsections?: { heading: string; content: string }[];
}
```

### 5.2 Blog Generation (Gemini Pro — longer context needed)

```typescript
export async function generateBlogPost(input: GenerationInput): Promise<BlogContent> {
  const prompt = `
You are a content writer for ${input.brand.business_name}, a ${input.brand.industry} business in Nigeria.
Write a complete, high-quality blog post on: ${input.topic}

Business context:
- Services: ${input.brand.services.join(", ")}
- Target audience: ${input.brand.target_audience}
- Location: ${input.brand.location_city ?? input.brand.location}, Nigeria
- Brand tone: ${input.brand.brand_tone}

Blog post requirements:
- Total length: 800-1200 words
- Audience: ${input.brand.target_audience}
- SEO focus: naturally include the topic as a keyword phrase
- Must be specific to the Nigerian/African context — not generic Western content
- Practical and actionable — readers should learn something useful
- Written in first-person plural (we/our) representing the business
- Title: compelling, SEO-optimized, creates curiosity or promises value
- Structure: intro → 3-5 H2 sections → conclusion with CTA

Output ONLY valid JSON (no markdown wrapping):
{
  "title": "SEO blog title (max 70 chars)",
  "meta_description": "Meta description (max 155 chars)",
  "introduction": "Opening 2-3 paragraphs (100-150 words)",
  "sections": [
    {
      "heading": "H2 section heading",
      "content": "Section body (200-300 words)"
    }
  ],
  "conclusion": "Closing paragraph with soft CTA (80-120 words)",
  "cta": {
    "text": "CTA sentence that leads to action",
    "button_label": "Action label (max 5 words)"
  },
  "suggested_tags": ["keyword1", "keyword2", "keyword3"],
  "reading_time_minutes": 5
}
`;

  const blog = await geminiJSON<BlogContent>(prompt, "pro");

  // Calculate actual word count
  const allText = [
    blog.introduction,
    ...blog.sections.map(s => s.content),
    blog.conclusion,
  ].join(" ");
  blog.word_count = allText.split(/\s+/).length;

  // Validate lengths
  if (blog.title?.length > 70) blog.title = blog.title.slice(0, 70);
  if (blog.meta_description?.length > 155) blog.meta_description = blog.meta_description.slice(0, 155);

  // Check for placeholder text
  const fullContent = JSON.stringify(blog);
  if (/\[.*?\]|lorem ipsum|placeholder/i.test(fullContent)) {
    throw new Error("Blog post contains placeholder text — regeneration required");
  }

  return blog;
}
```

---

## 6. EMAIL NEWSLETTER GENERATION

### 6.1 Newsletter Structure

```typescript
export interface NewsletterContent {
  subject: string;                      // Max 50 chars — must drive opens
  preheader: string;                    // Max 90 chars — preview text
  sections: NewsletterSection[];
  footer_tagline: string;
  estimated_read_time: string;          // "2 min read"
}

export type NewsletterSectionType =
  | "hero"
  | "main_content"
  | "featured_item"
  | "tips_list"
  | "testimonial_highlight"
  | "event_announcement"
  | "closing";

export interface NewsletterSection {
  type: NewsletterSectionType;
  headline?: string;
  subheadline?: string;
  content?: string;
  items?: string[];                     // For tips_list type
  cta_text?: string;
  cta_url?: string;
  image_suggestion?: string;            // Describes what image to put here (user sources it)
}
```

### 6.2 Newsletter Generation (Gemini Pro)

```typescript
export async function generateNewsletter(input: GenerationInput): Promise<NewsletterContent> {
  const prompt = `
You are writing an email newsletter for ${input.brand.business_name}, a ${input.brand.industry} in Nigeria.
Newsletter topic: ${input.topic}
Brief: ${input.brief}
Brand tone: ${input.brand.brand_tone}
Audience: ${input.brand.target_audience}

Write a complete email newsletter that subscribers will actually want to read.

Rules:
- Subject line: max 50 chars. Creates curiosity or urgency. Not clickbait. Specific to this business.
- Preheader: max 90 chars. Complements the subject line.
- Length: 300-500 words total (readers scan newsletters, keep it tight)
- Tone: warm, direct, valuable — like a message from a trusted business owner
- Every section must be specific to ${input.brand.business_name} — no generic content
- Include ONE primary CTA that drives a clear action (book, buy, read, visit)
- Nigerian/African context: reference local culture, events, or seasons where relevant
- Close warmly — sign off as the brand

Output ONLY valid JSON:
{
  "subject": "Email subject (max 50 chars)",
  "preheader": "Preview text (max 90 chars)",
  "sections": [
    {
      "type": "hero",
      "headline": "Main newsletter headline",
      "subheadline": "Supporting sentence"
    },
    {
      "type": "main_content",
      "content": "Main body of the newsletter (150-250 words)",
      "image_suggestion": "Brief description of an ideal image for this section"
    },
    {
      "type": "featured_item",
      "headline": "Feature headline (service, product, offer, or story)",
      "content": "Brief description (50-80 words)",
      "cta_text": "CTA text (max 5 words)",
      "cta_url": "#"
    },
    {
      "type": "closing",
      "content": "Warm closing (40-60 words). Sign off as the business."
    }
  ],
  "footer_tagline": "Brand tagline or closing phrase",
  "estimated_read_time": "2 min read"
}
`;

  const newsletter = await geminiJSON<NewsletterContent>(prompt, "pro");

  // Validate
  if (newsletter.subject?.length > 50) newsletter.subject = newsletter.subject.slice(0, 50);
  if (newsletter.preheader?.length > 90) newsletter.preheader = newsletter.preheader.slice(0, 90);

  return newsletter;
}
```

---

## 7. VIDEO GENERATION (COMING SOON — HIGGSFIELD PLACEHOLDER)

All video format slots produce a VIDEO SCRIPT and a THUMBNAIL PROMPT. When Higgsfield API launches, the script and thumbnail prompt feed directly into their API. The architecture is built and waiting.

### 7.1 Video Script Generation

```typescript
export interface VideoScript {
  hook_line: string;            // First 3 seconds — must grab attention instantly
  hook_visual: string;          // What the camera/visual should show in the hook
  body_beats: ScriptBeat[];     // 3-5 beats, each ~5-10 seconds
  cta: string;                  // Last 5 seconds — clear call to action
  cta_visual: string;           // Visual for the CTA moment
  thumbnail_prompt: string;     // Imagen prompt for the thumbnail
  total_duration_seconds: number;
  video_style: string;          // e.g. "talking head", "product showcase", "B-roll montage"
  caption_for_post: string;     // Social media caption to accompany the video post
  hashtags: string[];
  status: "script_ready";       // Always this until Higgsfield launches
}

export interface ScriptBeat {
  time_seconds: number;         // Timestamp (e.g. 0, 4, 10, 16, 22)
  spoken_text: string;          // What is said (if talking head)
  visual_direction: string;     // What the viewer sees
  text_overlay?: string;        // On-screen text (max 6 words)
}

export async function generateVideoScript(input: GenerationInput): Promise<VideoScript> {
  const durationMap: Record<string, number> = {
    reel: 30,
    short_video: 60,
  };
  const duration = durationMap[input.formatType] ?? 30;

  const prompt = `
You are a video content director for ${input.brand.business_name} (${input.brand.industry}, Nigeria).
Create a complete ${duration}-second video script for ${input.platform}.

Topic: ${input.topic}
Brief: ${input.brief}
Brand tone: ${input.brand.brand_tone}
Audience: ${input.brand.target_audience}

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

  // Generate thumbnail image immediately (even though video is coming soon)
  // This gives the user something visual to see in the calendar slot
  try {
    const thumbnailBase64 = await generateImage(script.thumbnail_prompt, "9:16");
    const thumbnailUrl = await uploadImageToStorage(
      createServiceClient(),
      input.userId,
      thumbnailBase64,
      "thumbnail"
    );
    (script as any).thumbnail_url = thumbnailUrl;
  } catch (err) {
    console.warn("Thumbnail generation failed:", err);
  }

  return script;
}
```

### 7.2 Higgsfield Integration Stub (ready for when API launches)

```typescript
// src/lib/content/higgsfield.ts
// This file is a placeholder. Fill in when Higgsfield API is available.

export interface HiggsFieldGenerationInput {
  script: VideoScript;
  brand: BusinessProfile;
  style_preset?: string;
}

export async function generateVideoWithHighgsfield(
  input: HiggsFieldGenerationInput
): Promise<{ videoUrl: string; duration: number }> {
  // TODO: Replace stub with actual Higgsfield API call when available
  // Expected API shape (based on Higgsfield's announced roadmap):
  // POST https://api.higgsfield.ai/v1/generate
  // { script, style, aspect_ratio, brand_colors }

  throw new Error(
    "Higgsfield video generation is not yet available. Your script is saved and ready. " +
    "We will notify you when video generation launches."
  );
}
```

---

## 8. STANDALONE GENERATION (NO CALENDAR SLOT)

Users can generate content without a pre-planned calendar slot — useful for ad-hoc posts, urgent announcements, or experimenting.

```typescript
// src/app/api/content/generate/route.ts

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { platform, formatType, topic, hook, brief, calendarSlotId } = body;

  // ── Validate inputs ─────────────────────────────────────────────────────────
  const errors: string[] = [];

  if (!platform || !["instagram", "facebook", "linkedin", "x", "tiktok"].includes(platform)) {
    errors.push("Invalid platform");
  }
  if (!formatType) errors.push("Format type is required");
  if (!topic || sanitizeText(topic).length < 3) errors.push("Topic is required (min 3 chars)");
  if (topic && sanitizeText(topic).length > 200) errors.push("Topic too long (max 200 chars)");
  if (brief && sanitizeText(brief).length > 500) errors.push("Brief too long (max 500 chars)");

  // Validate format type is valid for this platform
  const validFormats = PLATFORM_FORMATS[platform]?.map(f => f.type) ?? [];
  if (formatType && !validFormats.includes(formatType)) {
    errors.push(`"${formatType}" is not a valid format for ${platform}`);
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
  }

  // ── Check plan access ───────────────────────────────────────────────────────
  const isImageFormat = IMAGE_FORMATS.has(formatType);
  const isBlogFormat = formatType === "blog_post";
  const isNewsletterFormat = formatType === "newsletter";

  if (isImageFormat) {
    const gate = await checkUsageLimit(supabase, user.id, "images_generated");
    if (!gate.allowed) {
      return NextResponse.json({
        error: "Image generation limit reached",
        used: gate.used,
        limit: gate.limit,
        upgradeRequired: "premium",
      }, { status: 403 });
    }
  }

  if (isBlogFormat) {
    const gate = await checkUsageLimit(supabase, user.id, "blog_posts_generated");
    if (!gate.allowed) {
      return NextResponse.json({ error: "Blog post limit reached" }, { status: 403 });
    }
  }

  if (isNewsletterFormat) {
    const gate = await checkUsageLimit(supabase, user.id, "newsletters_generated");
    if (!gate.allowed) {
      return NextResponse.json({ error: "Newsletter limit reached" }, { status: 403 });
    }
  }

  // ── Fetch brand and archetype ───────────────────────────────────────────────
  const { data: brand } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!brand) return NextResponse.json({ error: "No brand profile found" }, { status: 404 });

  const { data: website } = await supabase
    .from("websites")
    .select("archetype")
    .eq("user_id", user.id)
    .single();

  const archetype = (website?.archetype ?? resolveArchetype(
    brand.business_type,
    brand.industry,
    brand.services,
    brand.brand_vibe
  )) as DesignArchetype;

  // ── Run pipeline ────────────────────────────────────────────────────────────
  const output = await runGenerationPipeline({
    userId: user.id,
    calendarSlotId: calendarSlotId ?? undefined,
    platform,
    formatType,
    topic: sanitizeText(topic),
    hook: sanitizeText(hook ?? ""),
    brief: sanitizeText(brief ?? ""),
    brand,
    archetype,
  });

  return NextResponse.json(output);
}
```

---

## 9. CONTENT REGENERATION

```typescript
// src/app/api/content/regenerate/route.ts
// Regenerates a specific aspect of an existing generated_content record

export async function POST(req: Request) {
  // ... auth check ...

  const { contentId, regenerateField } = await req.json();
  // regenerateField: "caption" | "hashtags" | "image" | "all"

  const { data: content } = await supabase
    .from("generated_content")
    .select("*")
    .eq("id", contentId)
    .eq("user_id", user.id)
    .single();

  if (!content) return NextResponse.json({ error: "Content not found" }, { status: 404 });

  // For image regeneration: check usage limit (counts against monthly allowance)
  if (regenerateField === "image" || regenerateField === "all") {
    const gate = await checkUsageLimit(supabase, user.id, "images_generated");
    if (!gate.allowed) {
      return NextResponse.json({ error: "Image generation limit reached" }, { status: 403 });
    }
  }

  // ... regenerate and update the specific field ...
  return NextResponse.json({ success: true, content: updatedContent });
}
```

---

## 10. CONTENT EXPORT

Every generated content item can be exported. Export options shown in the UI based on content type.

```typescript
// src/app/api/content/export/route.ts

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const contentId = searchParams.get("id");
  const format = searchParams.get("format"); // "caption" | "hashtags" | "blog_markdown" | "blog_html" | "newsletter_html" | "image_download"

  // ... auth + fetch content ...

  switch (format) {
    case "caption":
      // Return plain text caption for clipboard copy
      return new Response(content.caption, { headers: { "Content-Type": "text/plain" } });

    case "hashtags":
      return new Response(content.hashtags.join(" "), { headers: { "Content-Type": "text/plain" } });

    case "blog_markdown":
      const markdown = blogContentToMarkdown(content.blog_content);
      return new Response(markdown, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="blog-post-${contentId}.md"`,
        },
      });

    case "blog_html":
      const html = blogContentToHTML(content.blog_content);
      return new Response(html, {
        headers: {
          "Content-Type": "text/html",
          "Content-Disposition": `attachment; filename="blog-post-${contentId}.html"`,
        },
      });

    case "newsletter_html":
      const newsletterHtml = newsletterContentToHTML(content.newsletter_content, brand);
      return new Response(newsletterHtml, {
        headers: {
          "Content-Type": "text/html",
          "Content-Disposition": `attachment; filename="newsletter-${contentId}.html"`,
        },
      });

    default:
      return NextResponse.json({ error: "Invalid export format" }, { status: 400 });
  }
}
```

---

## 11. DATABASE SCHEMA

```sql
-- ============================================================
-- GENERATED CONTENT
-- ============================================================
CREATE TABLE IF NOT EXISTS generated_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  calendar_slot_id uuid REFERENCES content_calendar(id) ON DELETE SET NULL,
  platform text NOT NULL,
  format_type text NOT NULL,
  caption text,
  hashtags text[] DEFAULT '{}',
  image_url text,
  image_prompt_used text,
  carousel_image_urls text[] DEFAULT '{}',
  blog_content jsonb,
  newsletter_content jsonb,
  video_script jsonb,
  thumbnail_url text,
  status text NOT NULL DEFAULT 'ready',
  -- status: ready | partial | failed
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own content" ON generated_content FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_generated_content_user ON generated_content(user_id);
CREATE INDEX idx_generated_content_slot ON generated_content(calendar_slot_id);
CREATE INDEX idx_generated_content_platform ON generated_content(user_id, platform);

-- ============================================================
-- GENERATED IMAGES STORAGE BUCKET (create in Supabase dashboard)
-- ============================================================
-- Bucket name: "generated-images"
-- Public: true (images need to be served to published sites)
-- File size limit: 10MB
-- Allowed MIME types: image/jpeg, image/png, image/webp
-- Path structure: {user_id}/generated/{format_type}-{timestamp}.jpg
--                 {user_id}/generated/thumbnail-{timestamp}.jpg
```

---

## 12. ALL API ROUTES

| Method | Route | Description | Auth | Plan Gate |
|---|---|---|---|---|
| POST | /api/content/generate | Generate content (standalone or from slot) | Yes | Pro+ |
| POST | /api/content/regenerate | Regenerate specific field of existing content | Yes | Pro+ |
| GET | /api/content/[id] | Get a generated content item | Yes | Pro+ |
| DELETE | /api/content/[id] | Delete a generated content item | Yes | Pro+ |
| GET | /api/content/export | Export content in specified format | Yes | Pro+ |
| POST | /api/content/image/generate | Generate image only (no caption) | Yes | Pro+ (counts against image limit) |

---

## 13. PLAN-GATED FEATURES

| Feature | Free | Pro | Growth | Premium |
|---|---|---|---|---|
| Caption / copy generation | No | Unlimited | Unlimited | Unlimited |
| AI image generation | No | 15/month | 50/month | 200/month |
| Carousel generation (3-5 images) | No | Yes (counts as 3-5) | Yes | Yes |
| Blog post generation | No | 2/month | 6/month | Unlimited |
| Email newsletter generation | No | 1/month | 4/month | Unlimited |
| Video script generation | No | Yes (script only) | Yes (script only) | Yes (first video access) |
| Thumbnail generation for video | No | Yes (counts as 1 image) | Yes | Yes |
| X thread generation | No | Yes | Yes | Yes |
| LinkedIn article generation | No | Yes (counts as 1 blog) | Yes | Yes |
| Content regeneration | No | Yes (within limits) | Yes | Yes (unlimited) |
| Content export (all formats) | No | Yes | Yes | Yes |

---

## 14. ERROR HANDLING — COMPLETE MAP

| Scenario | System Action | User-Facing Message |
|---|---|---|
| Imagen API unavailable | Skip image, continue with caption only | "Image generation is temporarily unavailable. Your caption is ready. You can add an image manually." |
| Image blocked by safety filter | Auto-regenerate prompt once with more abstract/product-focused description. If blocked again, skip. | "We adjusted your image to meet content guidelines." (if successful) or same as above (if failed) |
| Imagen returns no image data | Retry once. If fails, skip. | Same as API unavailable |
| Image upload to Supabase fails | Retry once. If fails, return base64 as data URL temporarily. | "Image saved locally. It will be uploaded when connection is restored." |
| Caption generation produces placeholder text | Detect [brackets] pattern → auto-regenerate once with stricter prompt | Silent regeneration. If still has placeholders: "Please review your caption — some sections may need editing." |
| Caption exceeds platform character limit | Trim at the limit with "..." | No error — trimmed automatically |
| Blog generation fails (Gemini Pro timeout) | Retry once with Gemini Flash (lower quality acceptable) | "Blog post generated with reduced detail. You can regenerate for a fuller version." |
| Blog contains placeholder text | Throw error → surface retry button to user | "Blog generation encountered an issue. Please try again." |
| Newsletter generation fails | Same as blog | Same as blog |
| Video script generation fails | Return partial script if any beats were generated | "Script partially generated. Please review and complete the missing sections." |
| Image generation limit reached (e.g. 15/month on Pro) | Return 403 immediately | "You've used all 15 images this month. Upgrade to Growth for 50/month, or wait until [reset date]." |
| Blog limit reached | Return 403 | "You've used all [X] blog posts this month. [Upgrade] or wait until [date]." |
| Newsletter limit reached | Return 403 | Same pattern |
| User on Free plan tries to generate | Return 403 | "Content generation is available from the Pro plan. [Start free trial]" |
| Invalid platform provided | Return 400 | "Invalid platform. Please select from: Instagram, Facebook, LinkedIn, X, TikTok." |
| Format not valid for platform (e.g. LinkedIn article on Instagram) | Return 400 | "[Format] is not available on [platform]." |
| Topic too short (<3 chars) | Return 400 | "Please enter a more descriptive topic." |
| Topic contains only special characters or emojis | Return 400 | "Please describe your content topic using text." |
| Prompt injection detected in user input | Sanitize silently, continue | No error shown — input is cleaned before use |
| Gemini Flash rate limit | Exponential backoff: wait 2s, retry. Then 4s, retry. Then fail. | "Generation is taking longer than usual. Please try again in a moment." |
| Carousel: fewer than 2 images generated | Fail the carousel | "Could not generate enough carousel images. Please try again." |
| Blog: sections missing from Gemini output | Fill missing sections with a generic prompt targeting just that section | No error if at least 2 sections generated — just fewer sections than requested |
| Export format invalid | Return 400 | "Invalid export format requested." |
| Content item not found (wrong user_id) | Return 404 (not 403 — do not reveal existence) | "Content not found." |
| Supabase Storage bucket missing | Log critical error, alert admin | "Image storage is temporarily unavailable. Please try again shortly." |

---

## 15. ENVIRONMENT VARIABLES REQUIRED

```env
GEMINI_API_KEY=...                        # Used for both Gemini text AND Imagen
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

No separate Imagen API key is needed — it uses the same `GEMINI_API_KEY` with a different model path.

---

## 16. CONTENT UI REQUIREMENTS

### Generated Content View (per slot in calendar)
When a slot has status = "generated", clicking it shows:
- Image (full size, with "Regenerate Image" and "Upload Different" options)
- Caption (editable text area with character counter for the platform)
- Hashtags (editable tag chips with "Regenerate Hashtags" option)
- Export bar: [Copy Caption] [Copy Hashtags] [Download Image]
- For blog: [Copy Markdown] [Copy HTML] [Preview in new tab]
- For newsletter: [Copy HTML] [Preview Email]
- For video: [View Script] [Download Thumbnail] — badge "Video generation launching soon"
- [Mark as Posted] button — updates calendar slot status to "posted"

### Standalone Generation Page
Located at `/dashboard/content/generate`
- Platform selector (icon chips)
- Format type selector (based on selected platform)
- Topic input (text field)
- Hook input (optional — "What's the opening line or angle?")
- Brief input (optional — "Any extra context for the AI?")
- [Generate] button
- Output section: same as slot view above

---

## 17. IMPLEMENTATION ORDER

1. `src/lib/content/image-dimensions.ts` — no dependencies
2. `src/lib/content/caption-rules.ts` — no dependencies
3. `src/lib/content/image-prompt-generator.ts` — depends on archetypes
4. `src/lib/content/imagen.ts` — depends on Gemini API key
5. `src/lib/content/image-storage.ts` — depends on Supabase Storage
6. `src/lib/content/caption-generator.ts` — depends on Gemini
7. `src/lib/content/blog-generator.ts` — depends on Gemini
8. `src/lib/content/newsletter-generator.ts` — depends on Gemini
9. `src/lib/content/video-script-generator.ts` — depends on Gemini + Imagen (thumbnail)
10. `src/lib/content/higgsfield.ts` — stub only (throws not implemented)
11. `src/lib/content/generation-pipeline.ts` — orchestrates all of the above
12. Database migration (generated_content table + storage bucket)
13. Create Supabase Storage bucket "generated-images" (public, 10MB limit)
14. `src/app/api/content/generate/route.ts`
15. `src/app/api/content/regenerate/route.ts`
16. `src/app/api/content/export/route.ts`
17. Generated content view component (within calendar slot)
18. Standalone generation page at `/dashboard/content/generate`
19. Export utilities: `blogContentToMarkdown`, `blogContentToHTML`, `newsletterContentToHTML`
