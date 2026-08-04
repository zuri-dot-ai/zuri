#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPORT_PATH = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, "link-slot-audit.json");

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

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: templates, error } = await supabase
  .from("templates")
  .select("id, storage_path")
  .order("id");

if (error) {
  console.error(`Failed to read templates: ${error.message}`);
  process.exit(1);
}

const report = {
  generatedAt: new Date().toISOString(),
  totalTemplates: templates?.length ?? 0,
  ok: [],
  missingSlots: [],
  failedDownloads: [],
};

for (const row of templates ?? []) {
  const { data, error: downloadError } = await supabase.storage
    .from("website-templates")
    .download(row.storage_path);

  if (downloadError || !data) {
    report.failedDownloads.push({
      id: row.id,
      storage_path: row.storage_path,
      error: downloadError?.message ?? "No data returned",
    });
    continue;
  }

  const html = await data.text();
  const slotCount = countSlots(html);
  const item = {
    id: row.id,
    storage_path: row.storage_path,
    slotCount,
  };

  if (slotCount > 0) report.ok.push(item);
  else report.missingSlots.push(item);
}

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

const summary = [
  `total=${report.totalTemplates}`,
  `ok=${report.ok.length}`,
  `missing=${report.missingSlots.length}`,
  `failed=${report.failedDownloads.length}`,
  `report=${REPORT_PATH}`,
].join(" ");

console.log(summary);
if (report.missingSlots.length || report.failedDownloads.length) process.exit(2);
