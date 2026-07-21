import type { ImageAspectRatio } from "./image-dimensions";

export class ImageSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageSafetyError";
  }
}

const ABSTRACT_FALLBACK_PROMPT =
  "Abstract professional product photography, soft diffused natural light, clean minimal composition, warm inviting atmosphere, African-inspired textures and earth tones, photorealistic, high quality, no people, no faces, no text, no logos";

/**
 * Call Imagen 3 and return base64-encoded JPEG bytes.
 */
export async function generateImage(
  imagePrompt: string,
  aspectRatio: ImageAspectRatio
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  // imagen-3.0-generate-001 was retired ("no longer available to new users").
  // imagen-4.0-generate-001 is the current model ID as of 2026-07-21, though
  // note: on a free-tier Gemini API key this endpoint currently has zero
  // image-generation quota (confirmed via live 429 "limit: 0" response) —
  // callers must treat that as an expected failure mode, not a bug, and the
  // warning strings below already handle it as "temporarily unavailable".
  const model = process.env.GEMINI_IMAGEN_MODEL?.trim() || "imagen-4.0-generate-001";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: imagePrompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio,
          safetyFilterLevel: "block_most",
          personGeneration: "dont_allow",
        },
      }),
      signal: AbortSignal.timeout(60000),
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Imagen API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();

  if (data.predictions?.[0]?.raiFilteredReason) {
    throw new ImageSafetyError(
      `Image blocked by safety filter: ${data.predictions[0].raiFilteredReason}`
    );
  }

  const base64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!base64) throw new Error("Imagen returned no image data");

  return base64 as string;
}

export interface ImageGenerationResult {
  base64: string | null;
  usedFallback: boolean;
  warning?: string;
}

/**
 * Generate an image with one automatic abstract-prompt retry on safety blocks.
 * Never throws for safety — returns null base64 + warning instead.
 */
export async function generateImageWithSafetyRetry(
  imagePrompt: string,
  aspectRatio: ImageAspectRatio
): Promise<ImageGenerationResult> {
  try {
    const base64 = await generateImage(imagePrompt, aspectRatio);
    return { base64, usedFallback: false };
  } catch (err) {
    if (!(err instanceof ImageSafetyError)) {
      console.error("Image generation failed:", err);
      return {
        base64: null,
        usedFallback: false,
        warning:
          "Image generation failed. You can upload or search for an image manually.",
      };
    }

    try {
      const base64 = await generateImage(ABSTRACT_FALLBACK_PROMPT, aspectRatio);
      return {
        base64,
        usedFallback: true,
        warning: "We adjusted your image to meet content guidelines.",
      };
    } catch (retryErr) {
      console.error("Image safety retry failed:", retryErr);
      return {
        base64: null,
        usedFallback: true,
        warning:
          "Image generation is temporarily unavailable. Your caption is ready. You can add an image manually.",
      };
    }
  }
}
