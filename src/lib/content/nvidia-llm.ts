/**
 * NVIDIA NIM OpenAI-compatible chat client for Content AI.
 * Website composition stays on Gemini (`@/lib/gemini`).
 *
 * Docs: https://build.nvidia.com/ — base URL integrate.api.nvidia.com/v1
 */

const NVIDIA_BASE_URL =
  process.env.NVIDIA_API_BASE_URL?.trim() ||
  "https://integrate.api.nvidia.com/v1";

export const NVIDIA_FLASH =
  process.env.NVIDIA_LLM_FLASH_MODEL?.trim() || "deepseek-ai/deepseek-v4-flash";
export const NVIDIA_PRO =
  process.env.NVIDIA_LLM_PRO_MODEL?.trim() || "deepseek-ai/deepseek-v4-pro";

function getApiKey(): string {
  const key = process.env.NVIDIA_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "NVIDIA_API_KEY is missing. Get a key at https://build.nvidia.com and set it in Vercel / .env.local"
    );
  }
  return key;
}

function isTimeoutError(err: unknown): boolean {
  if (err instanceof Error && err.name === "AbortError") return true;
  return /timeout|AbortError/i.test(String(err));
}

function isNonRetryable(err: unknown): boolean {
  if (isTimeoutError(err)) return true;
  const msg = String(err);
  return /status=401|status=403|UNAUTHORIZED|FORBIDDEN|API[_ ]?KEY/i.test(msg);
}

export async function nvidiaGenerate(
  prompt: string,
  model: "flash" | "pro" | string = "flash",
  opts?: { temperature?: number; json?: boolean }
): Promise<string> {
  const modelId =
    model === "flash"
      ? NVIDIA_FLASH
      : model === "pro"
        ? NVIDIA_PRO
        : model;
  const temperature = opts?.temperature ?? 0.7;
  const wantJson = opts?.json ?? false;

  // Avoid response_format — not all NIM models accept it; prompt + parse is enough.
  const body: Record<string, unknown> = {
    model: modelId,
    messages: [
      {
        role: "user",
        content: wantJson
          ? `${prompt}\n\nRespond with valid JSON only. No markdown fences.`
          : prompt,
      },
    ],
    temperature,
    max_tokens: 8192,
  };

  const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    // 90s — leave headroom under Vercel maxDuration (120s) and client (130s).
    signal: AbortSignal.timeout(90_000),
  });

  const errText = await res.text();
  if (!res.ok) {
    throw new Error(
      `NVIDIA LLM error (model=${modelId}, status=${res.status}): ${errText.slice(0, 500)}`
    );
  }

  let data: {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  try {
    data = JSON.parse(errText) as typeof data;
  } catch {
    throw new Error(
      `NVIDIA LLM returned non-JSON body (model=${modelId}): ${errText.slice(0, 300)}`
    );
  }

  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) {
    throw new Error(
      `NVIDIA LLM returned empty content (model=${modelId})`
    );
  }
  return text;
}

/**
 * Content-path JSON helper — same call shape as nvidiaJSON("flash"|"pro").
 */
export async function nvidiaJSON<T>(
  prompt: string,
  model: "flash" | "pro" = "flash",
  maxRetries: number = 3
): Promise<T> {
  let lastError: unknown;
  const context = `nvidiaJSON(${model})`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const raw = await nvidiaGenerate(
        attempt > 1
          ? `${prompt}\n\nIMPORTANT: Output ONLY valid JSON. No markdown fences. Start with { or [ and end with } or ].`
          : prompt,
        model,
        { json: true }
      );

      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      return JSON.parse(cleaned) as T;
    } catch (err) {
      lastError = err;
      if (isNonRetryable(err)) break;

      // Never retry timeouts — they already burned most of the wall-clock budget.
      const msg = String(err);
      const retryable =
        /status=429|status=503|status=500|JSON|SyntaxError/i.test(msg);
      if (!retryable || attempt === maxRetries) break;

      console.warn(
        `[${context}] attempt ${attempt}/${maxRetries} failed. Retrying...`,
        msg.slice(0, 200)
      );
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }

  throw new Error(
    `nvidiaJSON: all retry attempts exhausted: ${String(lastError)}`
  );
}
