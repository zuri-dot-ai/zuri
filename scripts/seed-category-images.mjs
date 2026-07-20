/**
 * Seed category_images with curated picsum URLs (one row per archetype × slot).
 * Run: node --env-file=.env.local scripts/seed-category-images.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const ARCHETYPES = [
  "warm-sensory",
  "authority-minimal",
  "luxury-aspirational",
  "editorial-bold",
  "clean-modern",
  "portfolio-dramatic",
  "community-vibrant",
  "trust-professional",
];

const SLOTS = [
  "hero",
  "about",
  "gallery",
  "work",
  "before_after",
  "property",
  "founder",
  "case_study",
];

function loadEnv() {
  const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

function seedUrl(archetype, slot, n = 0) {
  const seed = `${archetype}-${slot}-${n}`.replace(/-/g, "");
  const w = slot === "hero" ? 1400 : slot === "about" ? 900 : 800;
  const h = slot === "hero" ? 900 : slot === "about" ? 1100 : 600;
  return `https://picsum.photos/seed/zuri-${seed}/${w}/${h}`;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");

  const sb = createClient(url, key);
  let inserted = 0;
  let skipped = 0;

  for (const archetype of ARCHETYPES) {
    for (const slot of SLOTS) {
      const { data: existing } = await sb
        .from("category_images")
        .select("id")
        .eq("archetype", archetype)
        .eq("slot_type", slot)
        .limit(1);

      if (existing?.length) {
        skipped++;
        continue;
      }

      for (let i = 0; i < 3; i++) {
        const publicUrl = seedUrl(archetype, slot, i);
        const storagePath = `seed/${archetype}/${slot}/${i}.jpg`;
        const { error } = await sb.from("category_images").insert({
          archetype,
          slot_type: slot,
          storage_path: storagePath,
          public_url: publicUrl,
          tags: ["seed", archetype, slot],
          width: 1200,
          height: 800,
        });
        if (error) throw new Error(`${archetype}/${slot}: ${error.message}`);
        inserted++;
      }
    }
  }

  console.log(`Done — inserted ${inserted} rows, skipped ${skipped} archetype/slot pairs (already seeded).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
