#!/usr/bin/env node
/**
 * Cross-check local template HTML + extracted metadata against
 * TEMPLATE_PROMPTS.md GENERATION CHECKLIST. Does NOT modify files.
 *
 * Usage: node scripts/check-template-checklist.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TEMPLATES_DIR = path.join(ROOT, "templates");
const EXCLUDE = new Set(["trust-professional/light-modern"]);

/** Placeholder names referenced in TEMPLATE_PROMPTS GLOBAL RULES + common per-category */
const KNOWN_PLACEHOLDER_PREFIXES = [
  "business_name",
  "tagline",
  "about_body",
  "service_",
  "testimonial_",
  "phone_number",
  "email_address",
  "whatsapp_number",
  "instagram_url",
  "address",
  "opening_hours",
  "founder_name",
  "founder_title",
  "stat_",
  "property_",
  "credential_",
  "work_",
  "case_study_",
  "cta_",
  "faq_",
  "hero_",
  "subhead",
  "headline",
  // Community-vibrant unique sections (TEMPLATE_PROMPTS.md category 7)
  "class_",
  "result_",
  "member_",
];

function listHtml(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listHtml(full));
    else if (e.isFile() && e.name.endsWith(".html")) out.push(full);
  }
  return out;
}

function isKnownPlaceholder(name) {
  return KNOWN_PLACEHOLDER_PREFIXES.some(
    (p) => name === p || name.startsWith(p)
  );
}

function checkTemplate(htmlPath) {
  const rel = path.relative(TEMPLATES_DIR, htmlPath).replace(/\\/g, "/");
  const key = rel.replace(/\.html$/, "");
  if (EXCLUDE.has(key)) return null;

  const html = fs.readFileSync(htmlPath, "utf8");
  const jsonPath = htmlPath.replace(/\.html$/i, ".json");
  const meta = fs.existsSync(jsonPath)
    ? JSON.parse(fs.readFileSync(jsonPath, "utf8"))
    : null;

  const fails = [];

  // 1. Placeholders match naming convention
  const ph = meta?.placeholder_fields ?? [];
  const invented = ph.filter((p) => !isKnownPlaceholder(p));
  if (invented.length) {
    fails.push(`Invented placeholder names: ${invented.join(", ")}`);
  }
  if (ph.includes("logo_url")) {
    fails.push("Uses {{logo_url}} (forbidden — business name is text logo)");
  }

  // 2. 6 service/work/property card slots, 4–6 hidden
  // Portfolio work grids may show all 6; still require optional slots OR 6 work images.
  const optionalSlots = [
    ...html.matchAll(/data-optional-slot=["'](\d+)["']/gi),
  ].map((m) => m[1]);
  const hiddenOptional = (
    html.match(
      /(?:hidden\s+[^>]*data-optional-slot=["'][456]["']|data-optional-slot=["'][456]["'][^>]*\bhidden\b)/gi
    ) || []
  ).length;
  const workSlots = [
    ...html.matchAll(/data-image-slot=["']work_(\d+)["']/gi),
  ].map((m) => m[1]);
  const hasServicePattern = /service_[1-6]_title|data-optional-slot=/i.test(html);
  const hasWorkGrid = workSlots.length >= 6;
  const hasPropertyCards = /property_[12]_title|data-image-slot=["']property_/i.test(
    html
  );

  if (hasServicePattern) {
    const has456 = ["4", "5", "6"].every((n) => optionalSlots.includes(n));
    if (!has456) {
      fails.push(
        `Missing data-optional-slot 4–6 (found: [${optionalSlots.join(",")}])`
      );
    }
    if (hiddenOptional < 3) {
      fails.push(
        `Cards 4–6 should be hidden by default (found ${hiddenOptional} hidden optional slots)`
      );
    }
  } else if (hasWorkGrid) {
    // Checklist: 6 work slots — portfolio may keep all visible (report if no optional pattern)
    if (optionalSlots.length === 0) {
      fails.push(
        "Work grid has 6 slots but no data-optional-slot 4–6 (checklist expects 4–6 hidden)"
      );
    }
  } else if (hasPropertyCards) {
    if (optionalSlots.length && hiddenOptional < 3) {
      fails.push(
        `Property template services: cards 4–6 should be hidden (found ${hiddenOptional})`
      );
    }
  } else {
    fails.push("No 6-slot service/work/property card pattern detected");
  }

  // 3. WhatsApp float + conditional-hide script
  if (!/id=["']whatsapp-float["']/.test(html)) {
    fails.push("Missing #whatsapp-float");
  } else if (
    !/getElementById\(['"]whatsapp-float['"]\)/.test(html) ||
    !/wa\.me/.test(html)
  ) {
    fails.push("WhatsApp float missing conditional-hide / wa.me script");
  }

  // 4. Instagram/social conditional hide
  if (/instagram_url|instagram-link/i.test(html)) {
    if (
      !/instagram-link|instagram_url/.test(html) ||
      !(
        /getElementById\(['"]instagram-link['"]\)/.test(html) ||
        /indexOf\(['"]\{\{/.test(html)
      )
    ) {
      fails.push("Instagram link present but no conditional-hide script detected");
    }
  }

  // 5. Responsive breakpoints — look for media queries covering mobile/tablet/desktop
  const media = [...html.matchAll(/@media[^{]+\{/gi)].map((m) => m[0]);
  if (media.length < 2) {
    fails.push(
      `Fewer than 2 @media breakpoints found (${media.length}) — expected ~3`
    );
  }

  // 6. Nav: sticky/fixed + scrolled + hamburger/drawer
  if (!/#main-nav|\.scrolled|position:\s*fixed/i.test(html)) {
    fails.push("Nav sticky/fixed or .scrolled pattern not detected");
  }
  if (!/hamburger|drawer/i.test(html)) {
    fails.push("Hamburger drawer not detected");
  }

  // 7. IntersectionObserver reveals
  if (!/IntersectionObserver/.test(html)) {
    fails.push("No IntersectionObserver for reveal animations");
  }
  if (/gsap|anime\.js|framer-motion|AOS\.|scrollreveal/i.test(html)) {
    fails.push("Animation library detected (should be vanilla IO only)");
  }

  // 8. Colors as CSS vars on :root
  const requiredVars = [
    "--color-bg",
    "--color-surface",
    "--color-text",
    "--color-text-muted",
    "--color-accent",
    "--color-accent-text",
  ];
  const rootMatch = html.match(/:root\s*\{[^}]*\}/i);
  if (!rootMatch) {
    fails.push("No :root color block");
  } else {
    const missing = requiredVars.filter((v) => !rootMatch[0].includes(v));
    if (missing.length) {
      fails.push(`:root missing CSS vars: ${missing.join(", ")}`);
    }
  }

  // 9. No lorem ipsum / obvious real business names as static copy
  if (/lorem ipsum/i.test(html)) {
    fails.push("Contains lorem ipsum");
  }

  // 10. Self-contained — no external JS frameworks (fonts + picsum OK)
  if (
    /cdn\.jsdelivr|unpkg\.com|jquery|bootstrap\.min|react\.|vue\.|alpinejs/i.test(
      html
    )
  ) {
    fails.push("External JS/CSS framework dependency detected");
  }

  // Bonus: picsum + data-image-slot pairing
  const imgsWithoutSlot = (
    html.match(/<img\b(?![^>]*data-image-slot)[^>]*>/gi) || []
  ).filter((tag) => /picsum\.photos|src=/i.test(tag));
  // Decorative-only imgs without slots are a soft fail if they look like content
  const contentImgsNoSlot = imgsWithoutSlot.filter(
    (t) => !/aria-hidden|role=["']presentation["']/i.test(t)
  );
  if (contentImgsNoSlot.length) {
    fails.push(
      `${contentImgsNoSlot.length} <img> without data-image-slot (may be intentional icons)`
    );
  }

  return {
    id: meta?.template_id ?? key.replace(/\//g, "-"),
    rel,
    fails,
  };
}

function main() {
  const files = listHtml(TEMPLATES_DIR).sort();
  const results = files.map(checkTemplate).filter(Boolean);
  const failing = results.filter((r) => r.fails.length > 0);
  const passing = results.filter((r) => r.fails.length === 0);

  console.log("\nGENERATION CHECKLIST CROSS-CHECK\n");
  console.log(`Checked: ${results.length}  Pass: ${passing.length}  Fail: ${failing.length}\n`);

  if (failing.length === 0) {
    console.log("All checked templates pass the automated checklist items.");
    return;
  }

  for (const r of failing) {
    console.log(`FAIL  ${r.id}  (${r.rel})`);
    for (const f of r.fails) console.log(`        - ${f}`);
    console.log("");
  }
}

main();
