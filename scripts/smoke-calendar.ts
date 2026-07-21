/**
 * Checkpoint script for the silent-AI-fallback fix — calls
 * generateMonthlyCalendar() directly with a realistic business profile and
 * prints the resulting topics + generation_source so we can confirm real,
 * distinct AI output (not "tip 1/tip 2/tip 3" template slots) without going
 * through the full app / auth flow.
 *
 * Usage: npx tsx scripts/smoke-calendar.ts
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

function loadEnv() {
  const file = join(process.cwd(), ".env.local");
  if (!existsSync(file)) {
    console.error("Missing .env.local at project root.");
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
  const { generateMonthlyCalendar } = await import(
    "../src/lib/content/calendar-generator"
  );

  const now = new Date();

  const result = await generateMonthlyCalendar({
    userId: "00000000-0000-0000-0000-000000000000",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    // Real test account profile (business_profiles row), intentionally thin —
    // matches Part 2's finding that onboarding often leaves target_audience
    // generic and location_city empty. Used to verify the thin-field
    // inference instruction in buildCalendarPrompt actually helps.
    brand: {
      business_name: "Pixelnest studio test",
      industry: "technology",
      services: ["Digital marketing"],
      target_audience: "everyone",
      location_city: null,
      brand_tone: "professional",
    },
    pillars: [
      { id: "p1", name: "Product Showcase", description: "Highlight specific products and their benefits", is_active: true, sort_order: 0 } as any,
      { id: "p2", name: "Education", description: "Teach skincare/haircare tips for melanin-rich skin", is_active: true, sort_order: 1 } as any,
      { id: "p3", name: "Behind the Scenes", description: "Show how products are made", is_active: true, sort_order: 2 } as any,
    ],
    platforms: ["instagram", "facebook"],
    postsPerMonth: 6,
  });

  console.log("usedFallback:", result.usedFallback);
  if (result.reason) console.log("reason:", result.reason);
  console.log(`Generated ${result.slots.length} slots:\n`);
  for (const s of result.slots) {
    console.log(`[${s.generation_source}] ${s.scheduled_date} (${s.platform}) — ${s.topic}`);
    console.log(`   hook: ${s.hook}`);
    console.log(`   brief: ${s.brief}`);
    console.log("");
  }
}

main().catch((err) => {
  console.error("Checkpoint script failed:", err);
  process.exit(1);
});
