import { geminiGenerate, geminiJSON, FLASH } from "@/lib/gemini";
import { sanitizeForPrompt } from "@/lib/utils/sanitize";
import type { DesignArchetype } from "@/lib/website/archetypes";
import { getAspectRatio } from "./image-dimensions";
import type { GenerationInput } from "./types";

interface ArchetypeImageSpec {
  image_style_keywords: string[];
  image_location_keywords: string[];
}

export const ARCHETYPE_IMAGE_SPECS: Record<DesignArchetype, ArchetypeImageSpec> =
  {
    "warm-sensory": {
      image_style_keywords: [
        "warm golden light",
        "appetizing textures",
        "rich food colours",
        "inviting close-ups",
      ],
      image_location_keywords: [
        "Lagos kitchen",
        "Nigerian market produce",
        "terracotta and wood",
        "West African dining",
      ],
    },
    "authority-minimal": {
      image_style_keywords: [
        "clean negative space",
        "muted neutrals",
        "sharp focus",
        "professional stillness",
      ],
      image_location_keywords: [
        "modern Lagos office",
        "minimal desk setup",
        "glass and concrete",
        "African professional interiors",
      ],
    },
    "luxury-aspirational": {
      image_style_keywords: [
        "soft glam lighting",
        "luxe textures",
        "elegant composition",
        "refined colour palette",
      ],
      image_location_keywords: [
        "Ikoyi spa atmosphere",
        "gold and marble accents",
        "Lagos beauty studio",
        "African luxury interiors",
      ],
    },
    "editorial-bold": {
      image_style_keywords: [
        "high contrast",
        "bold colour blocking",
        "dynamic angles",
        "street-fashion energy",
      ],
      image_location_keywords: [
        "Lagos street style",
        "African print textures",
        "urban market colour",
        "Nigerian creative spaces",
      ],
    },
    "clean-modern": {
      image_style_keywords: [
        "crisp daylight",
        "geometric simplicity",
        "tech-forward",
        "cool neutrals",
      ],
      image_location_keywords: [
        "modern African workspace",
        "clean desk tech",
        "Lagos startup office",
        "minimal product surfaces",
      ],
    },
    "portfolio-dramatic": {
      image_style_keywords: [
        "cinematic lighting",
        "dramatic shadows",
        "artful composition",
        "moody atmosphere",
      ],
      image_location_keywords: [
        "studio backdrop",
        "gallery lighting",
        "Lagos creative loft",
        "African artistic interiors",
      ],
    },
    "community-vibrant": {
      image_style_keywords: [
        "energetic colour",
        "motion-friendly framing",
        "bright natural light",
        "active lifestyle",
      ],
      image_location_keywords: [
        "Lagos gym energy",
        "outdoor fitness spaces",
        "community wellness settings",
        "Nigerian urban outdoors",
      ],
    },
    "trust-professional": {
      image_style_keywords: [
        "calm clinical light",
        "trustworthy neutrals",
        "orderly composition",
        "reassuring clarity",
      ],
      image_location_keywords: [
        "modern clinic interiors",
        "clean medical spaces",
        "Lagos professional suite",
        "African healthcare settings",
      ],
    },
  };

/** Strip injection / unsafe patterns; hard 500-char cap. */
export function sanitizeImagePrompt(prompt: string): string {
  return prompt
    .replace(/<[^>]*>/g, "")
    .replace(/ignore previous/gi, "")
    .replace(/ignore all instructions/gi, "")
    .replace(/you are now/gi, "")
    .replace(/\bSEX\b|\bNUDE\b|\bNAKED\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

export async function generateImagePrompt(
  input: GenerationInput
): Promise<string> {
  const spec =
    ARCHETYPE_IMAGE_SPECS[input.archetype] ??
    ARCHETYPE_IMAGE_SPECS["clean-modern"];
  const aspectRatio = getAspectRatio(input.platform, input.formatType);
  const isPortrait = aspectRatio === "4:5" || aspectRatio === "9:16";

  const businessName = sanitizeForPrompt(input.brand.business_name);
  const industry = sanitizeForPrompt(input.brand.industry);
  const topic = sanitizeForPrompt(input.topic);
  const brief = sanitizeForPrompt(input.brief);

  const prompt = `
You are a professional art director creating an image prompt for AI image generation.
The image is for a Nigerian ${industry} business called "${businessName}".

Content topic: ${topic}
Content brief: ${brief}
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

  const rawPrompt = await geminiGenerate(prompt, FLASH);
  return sanitizeImagePrompt(rawPrompt.trim());
}

export async function generateCarouselSlidePrompts(
  input: GenerationInput,
  slideCount = 4
): Promise<string[]> {
  const businessName = sanitizeForPrompt(input.brand.business_name);
  const industry = sanitizeForPrompt(input.brand.industry);
  const topic = sanitizeForPrompt(input.topic);

  const themePrompt = await geminiGenerate(
    `
Create a short visual style guide (2 sentences max) for a ${slideCount}-slide carousel post.
Business: ${businessName} (${industry})
Topic: ${topic}
The style must be consistent across all ${slideCount} slides.
Describe: colour palette, lighting style, and compositional approach.
Output ONLY the style guide text.
`,
    FLASH
  );

  const slidesPrompt = `
Create ${slideCount} individual image prompts for a carousel about: ${topic}
Business: ${businessName}
Visual theme for all slides: ${sanitizeForPrompt(themePrompt)}

Each slide must be different but visually cohesive.
NEVER include faces, people, logos, or text in any prompt.
Output ONLY valid JSON: { "slides": ["prompt1", "prompt2", "prompt3", "prompt4"] }
`;

  const { slides } = await geminiJSON<{ slides: string[] }>(
    slidesPrompt,
    "flash"
  );
  return (slides ?? [])
    .map((s) => sanitizeImagePrompt(s))
    .filter((s) => s.length > 10);
}
