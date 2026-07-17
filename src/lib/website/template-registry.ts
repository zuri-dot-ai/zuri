// src/lib/website/template-registry.ts
// Helpers for the `templates` table + website-templates Storage bucket.

import { createServiceClient } from "@/lib/supabase/service";
import type { DesignArchetype } from "@/lib/website/archetypes";
import type { TemplateMetadata, TemplateRow } from "@/types/website";

export type { ColorTheme, TemplateMetadata, TemplateRow } from "@/types/website";

const TEMPLATES_BUCKET = "website-templates";

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
  };
}

function storageJsonPath(htmlPath: string): string {
  return htmlPath.replace(/\.html$/i, ".json");
}

/** List all templates for an archetype (expected: 3 rows). */
export async function getTemplatesForArchetype(
  archetype: DesignArchetype
): Promise<TemplateRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("archetype", archetype)
    .order("id");

  if (error) throw new Error(`Failed to list templates for ${archetype}: ${error.message}`);
  return (data ?? []) as TemplateRow[];
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
