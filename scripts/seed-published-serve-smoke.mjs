/**
 * Mark one published website row (v1-compatible columns) for serve smoke.
 * HTML itself is served from tmp/generation-previews until v2 migration adds
 * websites.template_html.
 *
 * Usage: node scripts/seed-published-serve-smoke.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  for (const file of [join(root, ".env.local"), join(root, "src", "app", ".env.local")]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
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
}

loadEnv();

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 10,
  });
  if (listError) throw listError;
  const user = listData.users?.[0];
  if (!user) throw new Error("No auth users found");

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
  const protocol = rootDomain.includes("localhost") ? "http" : "https";

  // One DB row (user_id UNIQUE). Second archetype is fixture-only until
  // a second auth user exists + v2 template_html column is applied.
  const { data, error } = await supabase
    .from("websites")
    .upsert(
      {
        user_id: user.id,
        handle: "jollof-house-lagos",
        status: "published",
        archetype: "warm-sensory",
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("handle, status, archetype")
    .single();

  if (error) throw error;

  console.log(`✓ published DB row: ${data.handle} (${data.archetype})`);
  console.log("");
  console.log("Sanity-check URLs (start npm run dev first):");
  console.log(`  warm-sensory:  ${protocol}://${data.handle}.${rootDomain}`);
  console.log(`                ${protocol}://localhost:3000/sites/${data.handle}`);
  console.log(`  clean-modern:  ${protocol}://nairaflow.${rootDomain}`);
  console.log(`                ${protocol}://localhost:3000/sites/nairaflow`);
  console.log("");
  console.log(
    "Note: remote DB is still on v1 schema (no template_html). " +
      "Dev fixture fallback serves Session 2B HTML from tmp/generation-previews. " +
      "Apply supabase/migrations/20260716_website_builder_v2_templates.sql to enable DB-backed serving."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
