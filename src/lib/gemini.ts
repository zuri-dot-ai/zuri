import { ApiError, GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import { handleGeminiError } from "@/lib/errors/gemini-errors";

export const FLASH = process.env.GEMINI_FLASH_MODEL || "gemini-2.0-flash";
export const PRO = process.env.GEMINI_PRO_MODEL || "gemini-2.5-pro";

let aiClient: GoogleGenAI | null = null;
let aiMode: "api-key" | "vertex" | null = null;

function looksLikePlaceholderApiKey(apiKey: string): boolean {
  const k = apiKey.trim();
  if (!k || k.length < 30) return true;
  return /your_|xxxxx|changeme|example|placeholder/i.test(k);
}

function wantsVertex(): boolean {
  const flag = process.env.GEMINI_USE_VERTEX?.trim().toLowerCase();
  return flag === "true" || flag === "1" || flag === "yes";
}

function isNonRetryableGeminiError(err: unknown): boolean {
  const msg = String(err);
  return (
    /PERMISSION_DENIED|UNAUTHENTICATED|SERVICE_DISABLED|API_KEY_INVALID|API key not valid|403|401/i.test(
      msg
    )
  );
}

/**
 * Gemini Developer API (API key from aistudio.google.com) by default.
 * Vertex AI only when GEMINI_USE_VERTEX=true and a service-account file is available.
 * Load env from project-root .env.local only — never src/app/.env.local.
 */
function getAI(): GoogleGenAI {
  if (aiClient) return aiClient;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const useVertex = wantsVertex();

  if (!useVertex && apiKey && !looksLikePlaceholderApiKey(apiKey)) {
    if (!apiKey.startsWith("AIza")) {
      console.warn(
        "[Gemini] GEMINI_API_KEY does not start with AIza (typical AI Studio format). If calls fail, regenerate at https://aistudio.google.com/app/apikey"
      );
    }
    aiClient = new GoogleGenAI({ apiKey, vertexai: false });
    aiMode = "api-key";
    return aiClient;
  }

  if (!useVertex) {
    if (apiKey && looksLikePlaceholderApiKey(apiKey)) {
      throw new Error(
        "GEMINI_API_KEY looks like a placeholder. Set a real key from https://aistudio.google.com/app/apikey (or set GEMINI_USE_VERTEX=true with a service account)."
      );
    }
    throw new Error(
      "GEMINI_API_KEY is missing. Set it in project-root .env.local, or set GEMINI_USE_VERTEX=true with GOOGLE_APPLICATION_CREDENTIALS."
    );
  }

  const credentialsPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS || "./zuri-service-account.json";
  const absolutePath = path.resolve(credentialsPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `GEMINI_USE_VERTEX=true but credentials not found at ${absolutePath}. Set GOOGLE_APPLICATION_CREDENTIALS.`
    );
  }

  const credentials = JSON.parse(fs.readFileSync(absolutePath, "utf-8"));
  const project =
    process.env.GEMINI_PROJECT_ID?.trim() || credentials.project_id;
  const location = process.env.GEMINI_LOCATION?.trim() || "us-central1";

  if (!project) {
    throw new Error(
      "Vertex mode requires GEMINI_PROJECT_ID or project_id in the service-account JSON."
    );
  }

  aiClient = new GoogleGenAI({
    vertexai: true,
    project,
    location,
    googleAuthOptions: {
      credentials,
    },
  });
  aiMode = "vertex";
  return aiClient;
}

/** Test helper / diagnostics — which backend the singleton is using. */
export function getGeminiMode(): "api-key" | "vertex" | null {
  return aiMode;
}

interface GenerateOptions {
  model?: string;
  system?: string;
  temperature?: number;
  json?: boolean;
}

export async function geminiGenerate(
  prompt: string,
  modelIdOrOpts: string | GenerateOptions = {}
): Promise<string> {
  const opts: GenerateOptions =
    typeof modelIdOrOpts === "string"
      ? { model: modelIdOrOpts }
      : modelIdOrOpts;

  const {
    model = process.env.GEMINI_FLASH_MODEL || FLASH,
    system,
    temperature = 0.7,
    json = false,
  } = opts;

  const ai = getAI();

  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature,
        systemInstruction: system,
        ...(json ? { responseMimeType: "application/json" } : {}),
      },
    });
  } catch (err) {
    throw new Error(describeGeminiError(err, model));
  }

  const candidate = response.candidates?.[0];
  const finishReason = candidate?.finishReason;

  // A safety block or other non-STOP finish can return candidates: [] or a
  // candidate with no text parts — this must not look like an empty-but-ok
  // response, or callers silently proceed with "".
  if (
    finishReason &&
    finishReason !== "STOP" &&
    finishReason !== "MAX_TOKENS"
  ) {
    throw new Error(
      `Gemini generateContent (model=${model}) returned no usable content — finishReason=${finishReason}. ` +
        `promptFeedback=${JSON.stringify(response.promptFeedback ?? {}).slice(0, 300)}`
    );
  }

  const text = response.text ?? "";
  if (!text && (!response.candidates || response.candidates.length === 0)) {
    throw new Error(
      `Gemini generateContent (model=${model}) returned zero candidates. ` +
        `promptFeedback=${JSON.stringify(response.promptFeedback ?? {}).slice(0, 300)}`
    );
  }

  return text;
}

/**
 * Turn an SDK/fetch error into a message that always carries the real
 * status code + a truncated response body — never a bare generic message.
 * This is what makes model deprecations (404), quota exhaustion (429), and
 * malformed-request errors (400) distinguishable from Vercel function logs
 * alone, without needing to reproduce the failure locally.
 */
function describeGeminiError(err: unknown, model: string): string {
  if (err instanceof ApiError) {
    return `Gemini API error (model=${model}, status=${err.status}): ${err.message.slice(0, 500)}`;
  }
  if (err instanceof Error) {
    return `Gemini call failed (model=${model}): ${err.message.slice(0, 500)}`;
  }
  return `Gemini call failed (model=${model}): ${String(err).slice(0, 500)}`;
}

export async function geminiJSON<T>(
  prompt: string,
  model: "flash" | "pro",
  maxRetries?: number
): Promise<T>;
export async function geminiJSON<T>(
  prompt: string,
  opts?: Omit<GenerateOptions, "json">,
  maxRetries?: number
): Promise<T>;
export async function geminiJSON<T>(
  prompt: string,
  modelOrOpts: "flash" | "pro" | Omit<GenerateOptions, "json"> = {},
  maxRetries: number = 3
): Promise<T> {
  const flashModel = process.env.GEMINI_FLASH_MODEL || FLASH;
  const proModel = process.env.GEMINI_PRO_MODEL || PRO;
  const isAlias = modelOrOpts === "flash" || modelOrOpts === "pro";
  const modelId = isAlias
    ? modelOrOpts === "pro"
      ? proModel
      : flashModel
    : (modelOrOpts as Omit<GenerateOptions, "json">).model ?? flashModel;
  const baseOpts: Omit<GenerateOptions, "json"> = isAlias
    ? { model: modelId }
    : { ...(modelOrOpts as Omit<GenerateOptions, "json">), model: modelId };

  let lastError: unknown;
  const context = `geminiJSON(${isAlias ? modelOrOpts : modelId})`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const raw = await geminiGenerate(
        attempt > 1
          ? `${prompt}\n\nIMPORTANT: Output ONLY valid JSON. No markdown fences. Start with { end with }.`
          : prompt,
        { ...baseOpts, json: true }
      );

      const text = raw.trim();
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      return JSON.parse(cleaned) as T;
    } catch (err) {
      lastError = err;
      if (isNonRetryableGeminiError(err)) break;

      const { shouldRetry } = await handleGeminiError(err, context);
      if (!shouldRetry || attempt === maxRetries) break;

      console.warn(
        `Gemini JSON attempt ${attempt}/${maxRetries} failed. Retrying...`
      );
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }

  throw new Error(
    `geminiJSON: all retry attempts exhausted: ${String(lastError)}`
  );
}
