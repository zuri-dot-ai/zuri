#!/usr/bin/env node
/**
 * Apply 20260726_website_links_embeds.sql to the remote Supabase project.
 *
 * Prefers SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_ID (Management API).
 * Fallback: DATABASE_URL / SUPABASE_DB_URL via `pg`.
 * Also tries project /pg/query with the service role (may be disabled).
 *
 * Usage: node --env-file=.env.local scripts/apply-links-embeds-migration.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MIGRATION = path.join(
  ROOT,
  "supabase",
  "migrations",
  "20260726_website_links_embeds.sql"
);

function loadEnvFile() {
  for (const file of [
    path.join(ROOT, ".env.local"),
    path.join(ROOT, "src", "app", ".env.local"),
  ]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
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

async function columnsPresent(url, serviceKey) {
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase
    .from("websites")
    .select("id, filled_links, filled_embeds")
    .limit(1);
  return !error;
}

async function main() {
  loadEnvFile();
  const sql = fs.readFileSync(MIGRATION, "utf8");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_ID;
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL;

  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  if (await columnsPresent(url, serviceKey)) {
    console.log("OK — filled_links / filled_embeds already present");
    process.exit(0);
  }

  console.log("Columns missing — applying migration…");

  if (token && ref) {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${ref}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      }
    );
    const text = await res.text();
    if (!res.ok) {
      console.error(`Management API failed (${res.status}): ${text.slice(0, 500)}`);
    } else {
      console.log("Applied via Management API");
      if (await columnsPresent(url, serviceKey)) {
        console.log("Verified OK");
        process.exit(0);
      }
    }
  }

  for (const endpoint of [`${url}/pg/query`, `${url.replace(/\/$/, "")}/pg/query`]) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });
      const body = await res.text();
      console.log(`${endpoint} → ${res.status} ${body.slice(0, 200)}`);
      if (res.ok && (await columnsPresent(url, serviceKey))) {
        console.log("Verified OK");
        process.exit(0);
      }
    } catch (e) {
      console.log(`${endpoint} → ERR ${e instanceof Error ? e.message : e}`);
    }
  }

  if (dbUrl) {
    const pg = await import("pg");
    const client = new pg.default.Client({ connectionString: dbUrl });
    await client.connect();
    await client.query(sql);
    await client.end();
    console.log("Applied via DATABASE_URL");
    if (await columnsPresent(url, serviceKey)) {
      console.log("Verified OK");
      process.exit(0);
    }
  }

  console.error(`
Could not apply migration automatically.

Paste this SQL in the Supabase SQL Editor for project ${ref || "(unknown)"}:

${sql}
`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
