/**
 * Minimal Gemini AI Studio smoke test.
 * Usage: npx tsx scripts/smoke-gemini.ts
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

function loadEnv() {
  const file = join(process.cwd(), ".env.local");
  if (!existsSync(file)) {
    console.error("Missing .env.local at project root. Do not use src/app/.env.local.");
    process.exit(1);
  }
  const raw = readFileSync(file, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

async function main() {
  const key = process.env.GEMINI_API_KEY?.trim() ?? "";
  const useVertex = ["true", "1", "yes"].includes(
    (process.env.GEMINI_USE_VERTEX ?? "").trim().toLowerCase()
  );

  console.log("GEMINI_USE_VERTEX:", useVertex ? "true" : "false/absent");
  console.log(
    "GEMINI_API_KEY:",
    key
      ? `set (len=${key.length}, prefix=${key.slice(0, 4)}…)`
      : "MISSING"
  );
  if (key && !key.startsWith("AIza") && !useVertex) {
    console.warn(
      "Warning: AI Studio keys usually start with AIza. Regenerate at https://aistudio.google.com/app/apikey if calls fail."
    );
  }

  const { geminiJSON, getGeminiMode, FLASH, PRO } = await import(
    "../src/lib/gemini"
  );

  console.log("Models:", { FLASH, PRO });

  const flash = await geminiJSON<{ ok: boolean }>(
    'Output ONLY valid JSON: { "ok": true }',
    "flash"
  );
  console.log("Flash OK:", flash, "mode=", getGeminiMode());

  const pro = await geminiJSON<{ ok: boolean }>(
    'Output ONLY valid JSON: { "ok": true }',
    "pro"
  );
  console.log("Pro OK:", pro, "mode=", getGeminiMode());
  console.log("Smoke test passed.");
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
