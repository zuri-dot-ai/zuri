import { GoogleGenAI } from "@google/genai";
import { parseGeminiJSON } from "./utils";
import * as fs from "fs";
import * as path from "path";

// Load service account credentials
const credentialsPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS || "./zuri-service-account.json";
const absolutePath = path.resolve(credentialsPath);
const credentials = JSON.parse(fs.readFileSync(absolutePath, "utf-8"));

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GEMINI_PROJECT_ID || credentials.project_id,
  location: process.env.GEMINI_LOCATION || "us-central1",
  googleAuthOptions: {
    credentials,
  },
});

export const FLASH = process.env.GEMINI_FLASH_MODEL || "gemini-2.0-flash";
export const PRO = process.env.GEMINI_PRO_MODEL || "gemini-2.5-pro";

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
    model = FLASH,
    system,
    temperature = 0.7,
    json = false,
  } = opts;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature,
      systemInstruction: system,
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  });

  return response.text ?? "";
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
  const isAlias = modelOrOpts === "flash" || modelOrOpts === "pro";
  const modelId = isAlias
    ? modelOrOpts === "pro"
      ? PRO
      : FLASH
    : (modelOrOpts as Omit<GenerateOptions, "json">).model ?? FLASH;
  const baseOpts: Omit<GenerateOptions, "json"> = isAlias
    ? { model: modelId }
    : { ...(modelOrOpts as Omit<GenerateOptions, "json">), model: modelId };

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const raw = await geminiGenerate(
        attempt > 1
          ? `${prompt}\n\nIMPORTANT: Output ONLY valid JSON. No markdown fences. Start with { end with }.`
          : prompt,
        { ...baseOpts, json: true }
      );
      return parseGeminiJSON<T>(raw);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw new Error(
    `geminiJSON failed after ${maxRetries} attempts: ${String(lastError)}`
  );
}
