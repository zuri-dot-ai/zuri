/**
 * Safe fetch helpers — never call response.json() on non-JSON bodies.
 * Prevents opaque SyntaxError when proxies return plaintext like
 * "Request Entity Too Large".
 */

export class FetchError extends Error {
  readonly status: number;
  readonly bodyText: string;

  constructor(message: string, status: number, bodyText = "") {
    super(message);
    this.name = "FetchError";
    this.status = status;
    this.bodyText = bodyText.slice(0, 500);
  }
}

function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().includes("application/json");
}

async function parseBody(res: Response): Promise<{
  json: unknown | null;
  text: string;
}> {
  const contentType = res.headers.get("content-type");
  const text = await res.text();

  if (!text) return { json: null, text: "" };

  if (isJsonContentType(contentType)) {
    try {
      return { json: JSON.parse(text) as unknown, text };
    } catch {
      throw new FetchError(
        `Invalid JSON response (${res.status})`,
        res.status,
        text
      );
    }
  }

  // Best-effort: some APIs omit content-type but still return JSON
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return { json: JSON.parse(trimmed) as unknown, text };
    } catch {
      /* fall through — treat as plaintext */
    }
  }

  return { json: null, text };
}

function messageFromBody(json: unknown | null, text: string, status: number): string {
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    if (typeof obj.error === "string" && obj.error.trim()) return obj.error;
    if (typeof obj.message === "string" && obj.message.trim()) return obj.message;
  }
  if (text.trim()) {
    const snippet = text.trim().slice(0, 200);
    if (status === 413 || /entity too large/i.test(snippet)) {
      return "File is too large. Please use an image under 4MB.";
    }
    return snippet;
  }
  return `Request failed (${status})`;
}

/**
 * Fetch and parse JSON safely. Throws FetchError on non-OK or non-JSON errors.
 */
export async function safeFetchJSON<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, options);
  const { json, text } = await parseBody(res);

  if (!res.ok) {
    throw new FetchError(messageFromBody(json, text, res.status), res.status, text);
  }

  if (json === null) {
    throw new FetchError(
      `Expected JSON but got ${res.headers.get("content-type") ?? "unknown"}`,
      res.status,
      text
    );
  }

  return json as T;
}
