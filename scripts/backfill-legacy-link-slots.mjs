#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(ROOT, "link-slot-audit.json");
const LEGACY_ROOT = path.join(ROOT, "templates");
const BUCKET = "website-templates";

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

function countSlots(html) {
  return (html.match(/\bdata-link-slot=/gi) || []).length;
}

loadEnvFile();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!fs.existsSync(REPORT_PATH)) {
  console.error(`Missing audit report: ${REPORT_PATH}`);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
const missing = Array.isArray(report.missingSlots) ? report.missingSlots : [];

if (missing.length === 0) {
  console.log("No missing legacy templates to backfill.");
  process.exit(0);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const uploaded = [];
const failed = [];

for (const item of missing) {
  const localPath = path.join(LEGACY_ROOT, item.storage_path);
  if (!fs.existsSync(localPath)) {
    failed.push({ id: item.id, reason: `missing local file: ${localPath}` });
    continue;
  }

  const html = fs.readFileSync(localPath);
  const slotCount = countSlots(html.toString("utf8"));
  if (slotCount === 0) {
    failed.push({ id: item.id, reason: `local file still has 0 slots: ${localPath}` });
    continue;
  }

  const { error } = await supabase.storage.from(BUCKET).upload(item.storage_path, html, {
    contentType: "text/html",
    upsert: true,
    cacheControl: "3600",
  });

  if (error) {
    failed.push({ id: item.id, reason: error.message });
    continue;
  }

  uploaded.push({ id: item.id, storage_path: item.storage_path, slotCount });
  console.log(`OK ${item.id} -> ${item.storage_path} (${slotCount} slots)`);
}

console.log(`\nBackfill complete. uploaded=${uploaded.length} failed=${failed.length}`);
if (failed.length > 0) {
  for (const item of failed) console.error(`FAIL ${item.id}: ${item.reason}`);
  process.exit(2);
}
