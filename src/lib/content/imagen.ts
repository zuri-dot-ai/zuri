import type { ImageAspectRatio } from "./image-dimensions";

export class ImageSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageSafetyError";
  }
}

const ABSTRACT_FALLBACK_PROMPT =
  "Abstract professional product photography, soft diffused natural light, clean minimal composition, warm inviting atmosphere, African-inspired textures and earth tones, photorealistic, high quality, no people, no faces, no text, no logos";

const NVIDIA_BASE_URL =
  process.env.NVIDIA_API_BASE_URL?.trim() ||
  "https://integrate.api.nvidia.com/v1";

const NVIDIA_IMAGE_MODEL =
  process.env.NVIDIA_IMAGE_MODEL?.trim() ||
  "black-forest-labs/flux.1-dev";

/** Map Zuri aspect ratios to OpenAI-compatible image sizes. */
function sizeForAspect(aspectRatio: ImageAspectRatio): string {
  switch (aspectRatio) {
    case "9:16":
      return "576x1024";
    case "3:4":
    case "4:5":
      return "768x1024";
    case "16:9":
      return "1024x576";
    case "1:1":
    default:
      return "1024x1024";
  }
}

function getApiKey(): string {
  const key = process.env.NVIDIA_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "NVIDIA_API_KEY is missing. Get a key at https://build.nvidia.com"
    );
  }
  return key;
}

/**
 * Call NVIDIA FLUX (OpenAI-compatible images API) and return base64 JPEG/PNG bytes.
 * Content images are then uploaded to Supabase `generated-images`.
 */
export async function generateImage(
  imagePrompt: string,
  aspectRatio: ImageAspectRatio
): Promise<string> {
  const model = NVIDIA_IMAGE_MODEL;
  const size = sizeForAspect(aspectRatio);

  const response = await fetch(`${NVIDIA_BASE_URL}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: imagePrompt,
      n: 1,
      size,
      response_format: "b64_json",
    }),
    signal: AbortSignal.timeout(90_000),
  });

  const errBody = await response.text();
  if (!response.ok) {
    if (
      response.status === 400 &&
      /safety|nsfw|blocked|content.?policy/i.test(errBody)
    ) {
      throw new ImageSafetyError(
        `Image blocked by safety filter: ${errBody.slice(0, 300)}`
      );
    }
    throw new Error(
      `NVIDIA image API error (model=${model}, status=${response.status}): ${errBody.slice(0, 500)}`
    );
  }

  let data: {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  try {
    data = JSON.parse(errBody) as typeof data;
  } catch {
    throw new Error(
      `NVIDIA image API returned non-JSON: ${errBody.slice(0, 300)}`
    );
  }

  const b64 = data.data?.[0]?.b64_json;
  if (b64) return b64;

  // Some NIM builds return a URL — fetch and encode.
  const url = data.data?.[0]?.url;
  if (url) {
    const imgRes = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!imgRes.ok) {
      throw new Error(`Failed to download generated image: ${imgRes.status}`);
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    return buf.toString("base64");
  }

  throw new Error("NVIDIA image API returned no image data");
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
