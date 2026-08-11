// src/lib/website/template-registry.ts
// Helpers for the `templates` table + website-templates Storage bucket.
//
// CHANGED (2026-08 audit fix): getTemplatesForArchetype() previously
// returned ALL rows for an archetype, including 34 leftover v1 templates
// mixed in with 82 v2 ones — Gemini's template-selection call was choosing
// from a pool that included templates already decided to be retired.
// Now filters to template_version = 2 only. Requires migration
// 20260811_templates_v2_module_selector.sql to have run and backfilled
// template_version correctly first.

import { createServiceClient } from "@/lib/supabase/service";
import type { DesignArchetype } from "@/lib/website/archetypes";
import type { TemplateMetadata, TemplateRow } from "@/types/website";

export type { ColorTheme, TemplateMetadata, TemplateRow } from "@/types/website";

const TEMPLATES_BUCKET = "website-templates";

/** Templates below this version are legacy v1 and must never be selected
 *  for new generations — see TEMPLATE_PROMPTS_V2.md, which fully supersedes
 *  the original 24-template v1 library. */
const CURRENT_TEMPLATE_VERSION = 2;

function rowToMetadata(row: TemplateRow): TemplateMetadata {
  return {
    template_id: row.id,
    archetype: row.archetype,
    mode: row.mode,
    lean: row.lean,
    display_name: row.display_name,
    storage_path: row.storage_path,
    color_themes: row.color_themes,
    placeholder_fields: row.placeholder_fields,
    image_slots: row.image_slots,
    has_unique_section: false,
    // hero_type / supportedModules are read directly off the row by callers
    // that need them (module-selector.ts) via a cast, since TemplateMetadata
    // in types/website.ts hasn't been extended with these fields yet — see
    // note in generation-pipeline.ts selectModulesForWebsite().
  };
}

/** List all v2 templates for an archetype (legacy v1 rows excluded). */
export async function getTemplatesForArchetype(
  archetype: DesignArchetype
): Promise<TemplateRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("archetype", archetype)
    .eq("template_version", CURRENT_TEMPLATE_VERSION)
    .order("id");

  if (error) throw new Error(`Failed to list templates for ${archetype}: ${error.message}`);

  const rows = (data ?? []) as TemplateRow[];

  if (rows.length === 0) {
    // Defensive fallback: if template_version backfill hasn't run yet or
    // missed rows for this archetype, don't hard-fail generation — log
    // loudly and fall back to unfiltered so the pipeline still works,
    // but this should never happen in steady state post-migration.
    console.error(
      `[template-registry] No v2 templates found for archetype "${archetype}" — falling back to unfiltered query. Run/verify migration 20260811_templates_v2_module_selector.sql.`
    );
    const fallback = await supabase
      .from("templates")
      .select("*")
      .eq("archetype", archetype)
      .order("id");
    return (fallback.data ?? []) as TemplateRow[];
  }

  return rows;
}

/** Fetch a single template row by id. */
export async function getTemplateById(templateId: string): Promise<TemplateRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch template ${templateId}: ${error.message}`);
  return data as TemplateRow | null;
}

function storageJsonPath(htmlPath: string): string {
  return htmlPath.replace(/\.html$/i, ".json");
}

/**
 * Fetch template metadata + raw HTML from Storage bucket `website-templates`.
 * Uses the `templates` table for the storage path (and as metadata fallback if
 * the sidecar .json is missing).
 */
export async function fetchTemplate(
  templateId: string
): Promise<{ html: string; metadata: TemplateMetadata }> {
  const row = await getTemplateById(templateId);
  if (!row) {
    throw new Error(`Template not found: ${templateId}`);
  }

  const supabase = createServiceClient();

  const [htmlResult, jsonResult] = await Promise.all([
    supabase.storage.from(TEMPLATES_BUCKET).download(row.storage_path),
    supabase.storage.from(TEMPLATES_BUCKET).download(storageJsonPath(row.storage_path)),
  ]);

  if (htmlResult.error || !htmlResult.data) {
    throw new Error(
      `Failed to download template HTML at ${row.storage_path}: ${htmlResult.error?.message ?? "no data"}`
    );
  }

  const html = await htmlResult.data.text();

  if (!jsonResult.error && jsonResult.data) {
    const fromStorage = JSON.parse(await jsonResult.data.text()) as TemplateMetadata;
    return { html, metadata: fromStorage };
  }

  return { html, metadata: rowToMetadata(row) };
}
