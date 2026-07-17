#!/usr/bin/env node
/**
 * One-shot metadata extractor for local website templates.
 * Reads templates/[archetype]/[slug].html → writes sibling .json (TemplateMetadata).
 *
 * Color themes (Option 1): parse :root → theme-1 only; theme-2/theme-3 = null
 * (templates currently lack .theme-1/.theme-2/.theme-3 selectors).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TEMPLATES_DIR = path.join(ROOT, "templates");

const COLOR_KEYS = [
  "bg",
  "surface",
  "text",
  "text_muted",
  "accent",
  "accent_text",
];

const CSS_VAR_MAP = {
  "--color-bg": "bg",
  "--color-surface": "surface",
  "--color-text": "text",
  "--color-text-muted": "text_muted",
  "--color-accent": "accent",
  "--color-accent-text": "accent_text",
};

/** Canonical 24 from TEMPLATE_PROMPTS.md — mode/lean/display_name */
const CANONICAL = {
  "warm-sensory/dark-editorial": {
    mode: "dark",
    lean: "international",
    display_name: "Restaurant Dark Editorial",
  },
  "warm-sensory/dark-heritage": {
    mode: "dark",
    lean: "african",
    display_name: "Restaurant Dark Heritage",
  },
  "warm-sensory/light-airy": {
    mode: "light",
    lean: "international",
    display_name: "Restaurant Light Airy",
  },
  "authority-minimal/dark-minimal": {
    mode: "dark",
    lean: "international",
    display_name: "Authority Dark Minimal",
  },
  "authority-minimal/dark-heritage": {
    mode: "dark",
    lean: "african",
    display_name: "Authority Dark Heritage",
  },
  "authority-minimal/light-real-estate": {
    mode: "light",
    lean: "international",
    display_name: "Authority Light Real Estate",
  },
  "luxury-aspirational/dark-editorial": {
    mode: "dark",
    lean: "international",
    display_name: "Luxury Dark Editorial",
  },
  "luxury-aspirational/dark-heritage": {
    mode: "dark",
    lean: "african",
    display_name: "Luxury Dark Heritage",
  },
  "luxury-aspirational/light-airy": {
    mode: "light",
    lean: "international",
    display_name: "Luxury Light Airy",
  },
  "editorial-bold/dark-bold": {
    mode: "dark",
    lean: "international",
    display_name: "Editorial Dark Bold",
  },
  "editorial-bold/dark-culture": {
    mode: "dark",
    lean: "african",
    display_name: "Editorial Dark Culture",
  },
  "editorial-bold/light-bold": {
    mode: "light",
    lean: "international",
    display_name: "Editorial Light Bold",
  },
  "clean-modern/dark-modern": {
    mode: "dark",
    lean: "international",
    display_name: "Clean Dark Modern",
  },
  "clean-modern/dark-emerging": {
    mode: "dark",
    lean: "african",
    display_name: "Clean Dark Emerging",
  },
  "clean-modern/light-modern": {
    mode: "light",
    lean: "international",
    display_name: "Clean Light Modern",
  },
  "portfolio-dramatic/dark-dramatic": {
    mode: "dark",
    lean: "international",
    display_name: "Portfolio Dark Dramatic",
  },
  "portfolio-dramatic/dark-expression": {
    mode: "dark",
    lean: "african",
    display_name: "Portfolio Dark Expression",
  },
  "portfolio-dramatic/light-gallery": {
    mode: "light",
    lean: "international",
    display_name: "Portfolio Light Gallery",
  },
  "community-vibrant/dark-energy": {
    mode: "dark",
    lean: "international",
    display_name: "Community Dark Energy",
  },
  "community-vibrant/light-vibrant": {
    mode: "light",
    lean: "international",
    display_name: "Community Light Vibrant",
  },
  "community-vibrant/light-active": {
    mode: "light",
    lean: "international",
    display_name: "Community Light Active",
  },
  "trust-professional/light-professional": {
    mode: "light",
    lean: "international",
    display_name: "Trust Light Professional",
  },
  "trust-professional/light-community-care": {
    mode: "light",
    lean: "african",
    display_name: "Trust Light Community Care",
  },
  "trust-professional/dark-professional": {
    mode: "dark",
    lean: "international",
    display_name: "Trust Dark Professional",
  },
};

const AFRICAN_SLUG_HINTS = [
  "heritage",
  "culture",
  "emerging",
  "expression",
  "community-care",
];

const UNIQUE_SECTION_PATTERNS = [
  {
    name: "Opening Hours strip",
    test: (html) =>
      /id=["']hours-strip["']|opening.?hours|{{opening_hours}}/i.test(html),
  },
  {
    name: "Before/After row",
    test: (html) =>
      /before.?after|data-image-slot=["']before_|data-image-slot=["']after_/i.test(
        html
      ),
  },
  {
    name: "Featured Properties",
    test: (html) =>
      /data-image-slot=["']property_|{{property_\d+_title}}/i.test(html),
  },
  {
    name: "Credentials / trust bar",
    test: (html) =>
      /credential|trust.?bar|{{credential_\d+_name}}/i.test(html),
  },
  {
    name: "Work / masonry grid",
    test: (html) => /data-image-slot=["']work_|masonry|selected.?work/i.test(html),
  },
  {
    name: "Case Study spotlight",
    test: (html) =>
      /case.?study|data-image-slot=["']case_study["']|{{case_study_/i.test(html),
  },
  {
    name: "FAQ accordion",
    test: (html) => /faq|accordion|{{faq_\d+/i.test(html),
  },
];

function titleCaseSlug(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function resolveModeLean(archetype, slug) {
  const key = `${archetype}/${slug}`;
  const flags = [];

  if (CANONICAL[key]) {
    return { ...CANONICAL[key], flags, is_canonical: true };
  }

  flags.push("not_in_canonical_24");

  let mode = null;
  if (slug.startsWith("dark-")) mode = "dark";
  else if (slug.startsWith("light-")) mode = "light";
  else {
    flags.push("mode_unmapped_from_filename");
  }

  const leanHint = AFRICAN_SLUG_HINTS.find((h) => slug.includes(h));
  let lean = leanHint ? "african" : "international";
  if (!leanHint) {
    flags.push("lean_defaulted_international_confirm");
  } else {
    flags.push("lean_inferred_from_slug_hint");
  }

  const archetypeLabel = titleCaseSlug(archetype);
  const display_name = `${archetypeLabel} ${titleCaseSlug(slug)}`;

  return { mode, lean, display_name, flags, is_canonical: false };
}

function extractPlaceholders(html) {
  const re = /\{\{([a-z0-9_]+)\}\}/gi;
  const set = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    set.add(m[1].toLowerCase());
  }
  return [...set].sort();
}

function extractImageSlots(html) {
  const re = /data-image-slot=["']([^"']+)["']/gi;
  const set = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    set.add(m[1]);
  }
  return [...set].sort();
}

function extractRootColorBlock(html) {
  // Match first :root { ... } — non-greedy until closing brace at same level
  const match = html.match(/:root\s*\{([^}]*)\}/i);
  if (!match) return null;

  const body = match[1];
  const colors = {};
  for (const [cssVar, key] of Object.entries(CSS_VAR_MAP)) {
    const varRe = new RegExp(
      `${cssVar.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^;]+);`,
      "i"
    );
    const vm = body.match(varRe);
    if (vm) colors[key] = vm[1].trim();
  }
  return colors;
}

function buildColorThemes(html, flags) {
  const hasThemeSelectors = /\.theme-[123]\s*\{/i.test(html);
  if (hasThemeSelectors) {
    flags.push("has_theme_selectors_unexpected");
  } else {
    flags.push("missing_multi_theme_only_root");
  }

  const root = extractRootColorBlock(html);
  if (!root) {
    flags.push("no_root_color_block");
    return [null, null, null];
  }

  const missing = COLOR_KEYS.filter((k) => !root[k]);
  if (missing.length) {
    flags.push(`root_missing_vars:${missing.join(",")}`);
  }

  const theme1 = {
    key: "theme-1",
    bg: root.bg ?? "",
    surface: root.surface ?? "",
    text: root.text ?? "",
    text_muted: root.text_muted ?? "",
    accent: root.accent ?? "",
    accent_text: root.accent_text ?? "",
  };

  // Option 1: theme-2 / theme-3 left null
  return [theme1, null, null];
}

function detectUniqueSection(html) {
  for (const pattern of UNIQUE_SECTION_PATTERNS) {
    if (pattern.test(html)) {
      return { has_unique_section: true, unique_section_name: pattern.name };
    }
  }
  return { has_unique_section: false };
}

function listHtmlFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listHtmlFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      results.push(full);
    }
  }
  return results;
}

function processFile(htmlPath) {
  const rel = path.relative(TEMPLATES_DIR, htmlPath).replace(/\\/g, "/");
  const parts = rel.split("/");
  if (parts.length !== 2) {
    return {
      error: `Unexpected path depth: ${rel}`,
      rel,
    };
  }

  const [archetype, fileName] = parts;
  const slug = fileName.replace(/\.html$/i, "");
  const html = fs.readFileSync(htmlPath, "utf8");

  const resolved = resolveModeLean(archetype, slug);
  const flags = [...resolved.flags];

  const color_themes = buildColorThemes(html, flags);
  const placeholder_fields = extractPlaceholders(html);
  const image_slots = extractImageSlots(html);
  const unique = detectUniqueSection(html);

  const template_id = `${archetype}-${slug}`;
  const storage_path = `${archetype}/${slug}.html`;

  const metadata = {
    template_id,
    archetype,
    mode: resolved.mode,
    lean: resolved.lean,
    display_name: resolved.display_name,
    storage_path,
    color_themes,
    placeholder_fields,
    image_slots,
    has_unique_section: unique.has_unique_section,
    ...(unique.has_unique_section
      ? { unique_section_name: unique.unique_section_name }
      : {}),
    // Extraction diagnostics (not part of DB row; strip before upload if needed)
    _extraction: {
      is_canonical: resolved.is_canonical,
      flags,
      source_html: rel,
    },
  };

  const jsonPath = htmlPath.replace(/\.html$/i, ".json");
  fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2) + "\n", "utf8");

  return {
    template_id,
    archetype,
    mode: resolved.mode,
    lean: resolved.lean,
    placeholder_count: placeholder_fields.length,
    image_slot_count: image_slots.length,
    is_canonical: resolved.is_canonical,
    flags,
    json_path: path.relative(ROOT, jsonPath).replace(/\\/g, "/"),
  };
}

function main() {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    console.error(`Templates dir not found: ${TEMPLATES_DIR}`);
    process.exit(1);
  }

  const files = listHtmlFiles(TEMPLATES_DIR).sort();
  if (files.length === 0) {
    console.error("No .html files found under templates/");
    process.exit(1);
  }

  const rows = [];
  const errors = [];

  for (const file of files) {
    const result = processFile(file);
    if (result.error) {
      errors.push(result);
      continue;
    }
    rows.push(result);
  }

  // Summary table
  console.log("\nTEMPLATE METADATA EXTRACTION SUMMARY\n");
  console.log(
    [
      "template_id".padEnd(42),
      "archetype".padEnd(22),
      "mode".padEnd(6),
      "lean".padEnd(14),
      "ph".padStart(3),
      "img".padStart(4),
      "canon",
      "flags",
    ].join("  ")
  );
  console.log("-".repeat(120));

  for (const r of rows) {
    console.log(
      [
        r.template_id.padEnd(42),
        r.archetype.padEnd(22),
        String(r.mode ?? "?").padEnd(6),
        String(r.lean ?? "?").padEnd(14),
        String(r.placeholder_count).padStart(3),
        String(r.image_slot_count).padStart(4),
        r.is_canonical ? "yes  " : "NO   ",
        r.flags.filter((f) => f !== "missing_multi_theme_only_root").join("|") ||
          "(multi-theme missing — expected)",
      ].join("  ")
    );
  }

  console.log("\n--- COUNTS ---");
  console.log(`Total HTML files: ${files.length}`);
  console.log(`JSON written:     ${rows.length}`);
  console.log(`Canonical 24:     ${rows.filter((r) => r.is_canonical).length}`);
  console.log(`Extra (non-24):   ${rows.filter((r) => !r.is_canonical).length}`);
  console.log(
    `All missing multi-theme (Option 1): ${rows.every((r) =>
      r.flags.includes("missing_multi_theme_only_root")
    )}`
  );

  const needConfirm = rows.filter(
    (r) =>
      !r.is_canonical ||
      r.flags.some((f) => f.startsWith("lean_") || f.startsWith("mode_"))
  );
  if (needConfirm.length) {
    console.log("\n--- NEEDS MANUAL CONFIRM (lean/mode/extra) ---");
    for (const r of needConfirm) {
      console.log(
        `  ${r.template_id}: mode=${r.mode} lean=${r.lean} flags=[${r.flags.join(", ")}]`
      );
    }
  }

  if (errors.length) {
    console.log("\n--- ERRORS ---");
    for (const e of errors) console.log(`  ${e.rel}: ${e.error}`);
    process.exit(1);
  }
}

main();
