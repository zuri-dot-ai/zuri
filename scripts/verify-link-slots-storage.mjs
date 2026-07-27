#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

loadEnvFile();
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data, error } = await sb.storage
  .from("website-templates")
  .download("clean-modern/light-pivot.html");
if (error) {
  console.error("download failed:", error.message);
  process.exit(1);
}
const text = await data.text();
const slots = text.match(/data-link-slot/g) || [];
console.log("Storage clean-modern/light-pivot.html data-link-slot count:", slots.length);
process.exit(slots.length > 0 ? 0 : 2);
