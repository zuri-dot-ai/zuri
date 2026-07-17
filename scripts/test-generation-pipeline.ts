/**
 * End-to-end generation pipeline smoke test (docs/02_WEBSITE_BUILDER.md §4).
 *
 * Prefers Supabase `templates` + Storage. If those aren't reachable (common when
 * migrations aren't applied yet), falls back to local `templates/` HTML+JSON.
 *
 * Does NOT persist to `websites` and does NOT hit live onboarding.
 *
 * Usage: npx tsx scripts/test-generation-pipeline.ts
 */
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
} from "fs";
import { join } from "path";
import type { BusinessProfile } from "../src/types/brand";
import type { DesignArchetype } from "../src/lib/website/archetypes";
import type { TemplateMetadata, TemplateRow } from "../src/types/website";

function loadEnv() {
  const candidates = [
    join(process.cwd(), ".env.local"),
    join(process.cwd(), "src", "app", ".env.local"),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
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
}

loadEnv();

const SAMPLES: BusinessProfile[] = [
  {
    id: "sample-warm-1",
    user_id: "00000000-0000-0000-0000-000000000001",
    handle: "jollof-house-lagos",
    business_name: "Jollof House Lagos",
    industry: "Restaurant",
    business_type: "restaurant",
    services: [
      "Dine-in Nigerian cuisine",
      "Private event catering",
      "Weekend brunch",
      "Takeaway packs",
    ],
    target_audience: "Lagos food lovers and corporate event planners",
    location: "Lagos, Nigeria",
    location_city: "Lagos",
    brand_tone: "warm",
    unique_value:
      "Wood-fired jollof and coastal seafood in a lively Yaba courtyard",
    tagline: "Fire, flavour, and Friday nights",
    brand_vibe: "warm-friendly",
    color_primary: "#2C1810",
    color_accent: "#E8A838",
    platforms: ["instagram", "whatsapp"],
  },
  {
    id: "sample-clean-1",
    user_id: "00000000-0000-0000-0000-000000000002",
    handle: "nairaflow",
    business_name: "NairaFlow",
    industry: "Fintech / SaaS",
    business_type: "saas",
    services: [
      "Payment collection API",
      "Merchant dashboard",
      "Settlement reports",
      "Fraud alerts",
      "Developer sandbox",
    ],
    target_audience: "Nigerian startups and SME merchants",
    location: "Lagos, Nigeria",
    location_city: "Lagos",
    brand_tone: "professional",
    unique_value:
      "Local-currency settlements with developer-first APIs built for African banks",
    tagline: "Payments that settle overnight",
    brand_vibe: "clean-modern",
    color_primary: "#0B1F33",
    color_accent: "#3DDC97",
    platforms: ["linkedin", "twitter"],
  },
  {
    id: "sample-luxury-1",
    user_id: "00000000-0000-0000-0000-000000000003",
    handle: "aura-spa-ikoyi",
    business_name: "Aura Spa Ikoyi",
    industry: "Beauty & Spa",
    business_type: "salon-spa",
    services: [
      "Deep tissue massage",
      "Facial treatments",
      "Bridal packages",
      "Sauna & steam",
    ],
    target_audience: "Professionals and couples in Lagos Island",
    location: "Ikoyi, Lagos",
    location_city: "Lagos",
    brand_tone: "warm",
    unique_value:
      "Quiet, appointment-only wellness suites with organic botanical products",
    tagline: "Stillness, restored",
    brand_vibe: "elegant-luxurious",
    color_primary: "#1A1210",
    color_accent: "#C4A484",
    platforms: ["instagram"],
  },
];

function excerptCopy(fields: Record<string, string>): string {
  const keys = [
    "business_name",
    "tagline",
    "hero_headline",
    "headline",
    "hero_subheadline",
    "about_body",
    "about_text",
    "service_1_title",
    "service_1_description",
    "service_2_title",
    "cta_primary",
    "cta_text",
    "testimonial_1_quote",
    "testimonial_1_name",
  ];
  const lines: string[] = [];
  for (const k of keys) {
    if (fields[k]?.trim()) lines.push(`  ${k}: ${fields[k]}`);
  }
  for (let n = 1; n <= 6; n++) {
    const t = fields[`service_${n}_title`];
    if (t?.trim() && !lines.some((l) => l.includes(`service_${n}_title`))) {
      lines.push(`  service_${n}_title: ${t}`);
    }
  }
  return lines.join("\n") || "  (no common keys found — see filled_placeholders JSON)";
}

function loadLocalTemplates(archetype: DesignArchetype): TemplateRow[] {
  const dir = join(process.cwd(), "templates", archetype);
  if (!existsSync(dir)) return [];

  const rows: TemplateRow[] = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    const meta = JSON.parse(
      readFileSync(join(dir, name), "utf8")
    ) as TemplateMetadata;
    // Prefer canonical extractions when multiple exist
    const extraction = (
      meta as TemplateMetadata & {
        _extraction?: { is_canonical?: boolean };
      }
    )._extraction;
    if (extraction && extraction.is_canonical === false) continue;

    rows.push({
      id: meta.template_id,
      archetype: meta.archetype,
      mode: meta.mode,
      lean: meta.lean,
      display_name: meta.display_name,
      storage_path: meta.storage_path,
      color_themes: meta.color_themes,
      placeholder_fields: meta.placeholder_fields,
      image_slots: meta.image_slots,
      needs_revision: null,
      revision_note: null,
      created_at: new Date().toISOString(),
    });
  }

  // Dedupe by id, keep first
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

function fetchLocalTemplate(templateId: string, archetype: DesignArchetype): {
  html: string;
  metadata: TemplateMetadata;
} {
  const dir = join(process.cwd(), "templates", archetype);
  const jsonPath = join(
    dir,
    `${templateId.replace(`${archetype}-`, "")}.json`
  );
  // Also try scanning
  let metaPath = existsSync(jsonPath) ? jsonPath : null;
  if (!metaPath) {
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      const p = join(dir, name);
      const m = JSON.parse(readFileSync(p, "utf8")) as TemplateMetadata;
      if (m.template_id === templateId) {
        metaPath = p;
        break;
      }
    }
  }
  if (!metaPath) throw new Error(`Local metadata not found for ${templateId}`);

  const metadata = JSON.parse(
    readFileSync(metaPath, "utf8")
  ) as TemplateMetadata;
  const htmlPath = join(process.cwd(), "templates", metadata.storage_path);
  if (!existsSync(htmlPath)) {
    throw new Error(`Local HTML not found: ${htmlPath}`);
  }
  return { html: readFileSync(htmlPath, "utf8"), metadata };
}

async function templatesTableReachable(): Promise<boolean> {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return false;
    const sb = createClient(url, key);
    const { error } = await sb.from("templates").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

async function composeLocal(
  brand: BusinessProfile,
  archetype: DesignArchetype
) {
  const { geminiJSON } = await import("../src/lib/gemini");
  const {
    fillPlaceholders,
    resolveTemplateImages,
    applyPlaceholders,
    applyImages,
    applyServiceCardVisibility,
    validateFilledHtml,
    getArchetypeFallback,
  } = await import("../src/lib/website/generation-pipeline");

  const candidates = loadLocalTemplates(archetype);
  if (candidates.length === 0) {
    throw new Error(`No local templates for ${archetype}`);
  }

  const prompt = `
Pick the best-fit website template for this Nigerian business.

BUSINESS: ${brand.business_name} — ${brand.industry}
BRAND VIBE: ${brand.brand_vibe}
TARGET AUDIENCE: ${brand.target_audience}

CANDIDATE TEMPLATES:
${candidates.map((c) => `- ${c.id}: mode=${c.mode}, lean=${c.lean}, name="${c.display_name}"`).join("\n")}

Output ONLY valid JSON: { "template_id": "..." }
Pick "lean: african" only if the business's audience/positioning clearly benefits from it
(local-first businesses, culturally-forward branding). Otherwise default to "international"
for broader appeal. Pick "mode" based on brand_vibe: elegant/luxurious/moody → dark;
bright/airy/approachable/clinical/trustworthy → light.
`;

  let templateId = candidates[0].id;
  try {
    const picked = await geminiJSON<{ template_id: string }>(prompt, "flash");
    if (candidates.some((c) => c.id === picked.template_id)) {
      templateId = picked.template_id;
    }
  } catch (err) {
    console.warn("  selectTemplate Flash failed, using first candidate:", err);
  }

  const { html: rawHtml, metadata } = fetchLocalTemplate(templateId, archetype);
  const filledPlaceholders = await fillPlaceholders(brand, metadata, archetype);

  let filledImages: Awaited<ReturnType<typeof resolveTemplateImages>>;
  try {
    filledImages = await resolveTemplateImages(metadata, archetype);
  } catch {
    filledImages = Object.fromEntries(
      metadata.image_slots.map((slot) => [slot, getArchetypeFallback(archetype)])
    );
  }

  let html = applyPlaceholders(rawHtml, filledPlaceholders);
  html = applyImages(html, filledImages);
  html = applyServiceCardVisibility(html, filledPlaceholders);
  const validation = validateFilledHtml(html);

  return {
    html,
    archetype,
    template_id: templateId,
    filled_placeholders: filledPlaceholders,
    filled_images: filledImages,
    validation,
  };
}

async function main() {
  const { resolveArchetype } = await import("../src/lib/website/archetypes");
  const useRemote = await templatesTableReachable();
  console.log(
    useRemote
      ? "Mode: remote Supabase templates table"
      : "Mode: LOCAL templates/ fallback (remote templates table not reachable)"
  );

  let composeWebsiteHtml:
    | ((brand: BusinessProfile) => Promise<{
        html: string;
        archetype: DesignArchetype;
        template_id: string;
        filled_placeholders: Record<string, string>;
        filled_images: Record<string, unknown>;
        validation: { valid: boolean; errors: string[]; warnings: string[] };
      }>)
    | null = null;

  if (useRemote) {
    const mod = await import("../src/lib/website/generation-pipeline");
    composeWebsiteHtml = mod.composeWebsiteHtml;
  }

  const outDir = join(process.cwd(), "tmp", "generation-previews");
  mkdirSync(outDir, { recursive: true });

  const report: string[] = [
    "# Generation pipeline preview report",
    `Generated: ${new Date().toISOString()}`,
    `Mode: ${useRemote ? "remote" : "local-fallback"}`,
    "",
  ];

  for (const brand of SAMPLES) {
    const expected = resolveArchetype(
      brand.business_type,
      brand.industry,
      brand.services,
      brand.brand_vibe
    );
    console.log(
      `\n── ${brand.business_name} (expect archetype ≈ ${expected}) ──`
    );
    const started = Date.now();

    try {
      const result = useRemote
        ? await composeWebsiteHtml!(brand)
        : await composeLocal(brand, expected);
      const elapsed = ((Date.now() - started) / 1000).toFixed(1);
      const base = brand.handle;
      const htmlPath = join(outDir, `${base}.html`);
      const jsonPath = join(outDir, `${base}.json`);

      writeFileSync(htmlPath, result.html, "utf8");
      writeFileSync(
        jsonPath,
        JSON.stringify(
          {
            archetype: result.archetype,
            template_id: result.template_id,
            validation: result.validation,
            filled_placeholders: result.filled_placeholders,
            filled_images: result.filled_images,
          },
          null,
          2
        ),
        "utf8"
      );

      console.log(`  archetype: ${result.archetype}`);
      console.log(`  template:  ${result.template_id}`);
      console.log(`  valid:     ${result.validation.valid}`);
      if (result.validation.errors.length) {
        console.log(`  errors:    ${result.validation.errors.join("; ")}`);
      }
      console.log(`  elapsed:   ${elapsed}s`);
      console.log(`  wrote:     ${htmlPath}`);
      console.log("  copy:");
      console.log(excerptCopy(result.filled_placeholders));

      report.push(`## ${brand.business_name}`);
      report.push(`- Expected archetype: \`${expected}\``);
      report.push(`- Resolved archetype: \`${result.archetype}\``);
      report.push(`- Template: \`${result.template_id}\``);
      report.push(`- Valid: ${result.validation.valid}`);
      if (result.validation.errors.length) {
        report.push(`- Errors: ${result.validation.errors.join("; ")}`);
      }
      report.push(`- HTML: \`${htmlPath}\``);
      report.push(`- Elapsed: ${elapsed}s`);
      report.push("");
      report.push("### Copy excerpt");
      report.push("```");
      report.push(excerptCopy(result.filled_placeholders));
      report.push("```");
      report.push("");
    } catch (err) {
      console.error(`  FAILED:`, err);
      report.push(`## ${brand.business_name}`);
      report.push(
        `- **FAILED**: ${err instanceof Error ? err.message : String(err)}`
      );
      report.push("");
    }
  }

  const reportPath = join(outDir, "REPORT.md");
  writeFileSync(reportPath, report.join("\n"), "utf8");
  console.log(`\nReport: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
