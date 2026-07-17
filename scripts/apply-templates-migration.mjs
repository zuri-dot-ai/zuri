#!/usr/bin/env node
/**
 * Apply templates-related SQL migrations to the remote Supabase project.
 * Prefers SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_ID (Management API).
 * Fallback: DATABASE_URL / SUPABASE_DB_URL via `pg` if installed.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

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

const MIGRATIONS = [
  "20260716_website_builder_v2_templates.sql",
  "20260716_templates_library.sql",
];

async function main() {
  loadEnvFile();
  const sql = MIGRATIONS.map((name) =>
    fs.readFileSync(path.join(ROOT, "supabase", "migrations", name), "utf8")
  ).join("\n\n");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_ID;
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL;

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
      process.exit(1);
    }
    console.log("Applied migrations via Management API");
  } else if (dbUrl) {
    const pg = await import("pg");
    const client = new pg.default.Client({ connectionString: dbUrl });
    await client.connect();
    await client.query(sql);
    await client.end();
    console.log("Applied migrations via DATABASE_URL");
  } else {
    console.error(
      "Cannot apply SQL automatically.\n" +
        "Add SUPABASE_ACCESS_TOKEN (personal access token) to .env.local, OR\n" +
        "paste these files in the Supabase SQL Editor:\n" +
        MIGRATIONS.map((m) => `  - supabase/migrations/${m}`).join("\n")
    );
    process.exit(2);
  }

  if (url && serviceKey) {
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supabase.from("templates").select("id").limit(1);
    if (error) {
      console.error(`Post-check failed: ${error.message}`);
      process.exit(1);
    }
    console.log("templates table reachable");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
