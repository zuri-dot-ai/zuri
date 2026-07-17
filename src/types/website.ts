// ════════════════════════════════════════════════════════
//  ZURI — Website types (docs/02_WEBSITE_BUILDER.md §3, §7, §11)
// ════════════════════════════════════════════════════════

import type { DesignArchetype } from "@/lib/website/archetypes";

export type { DesignArchetype };

export type WebsiteStatus =
  | "generating"
  | "preview"
  | "published"
  | "suspended"
  | "failed"
  | "deleted";

export type ActiveTheme = "theme-1" | "theme-2" | "theme-3";

export interface ColorTheme {
  key: ActiveTheme;
  bg: string;
  surface: string;
  text: string;
  text_muted: string;
  accent: string;
  accent_text: string; // text color to use ON the accent
}

export interface TemplateMetadata {
  template_id: string; // e.g. "warm-sensory-dark-editorial"
  archetype: DesignArchetype;
  mode: "dark" | "light";
  lean: "international" | "african";
  display_name: string;
  storage_path: string; // path within website-templates bucket
  color_themes: [ColorTheme, ColorTheme, ColorTheme];
  placeholder_fields: string[];
  image_slots: string[];
  has_unique_section: boolean;
  unique_section_name?: string;
}

/** Image resolved into a template slot (curated library or user upload). */
export interface ResolvedImage {
  url: string;
  source: "curated" | "user-upload" | "fallback";
  width?: number | null;
  height?: number | null;
  alt?: string;
}

/** `templates` table row (§3.2) */
export interface TemplateRow {
  id: string;
  archetype: DesignArchetype;
  mode: "dark" | "light";
  lean: "international" | "african";
  display_name: string;
  storage_path: string;
  color_themes: [ColorTheme, ColorTheme, ColorTheme];
  placeholder_fields: string[];
  image_slots: string[];
  needs_revision: boolean | null;
  revision_note: string | null;
  created_at: string;
}

/** `category_images` table row (§3.3) */
export interface CategoryImageRow {
  id: string;
  archetype: DesignArchetype;
  slot_type: string;
  storage_path: string;
  public_url: string;
  tags: string[] | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

/** `websites` table row (§11) */
export interface WebsiteRow {
  id: string;
  user_id: string;
  handle: string;
  custom_domain: string | null;
  status: WebsiteStatus;
  template_id: string | null;
  active_theme: ActiveTheme;
  template_html: string | null;
  filled_placeholders: Record<string, string>;
  filled_images: Record<string, ResolvedImage>;
  archetype: DesignArchetype | null;
  needs_review: boolean;
  published_at: string | null;
  suspended_at: string | null;
  created_at: string;
  updated_at: string;
}

/** `website_images` table row (§11) */
export interface WebsiteImageRow {
  id: string;
  user_id: string;
  storage_path: string;
  public_url: string;
  slot: string | null;
  file_size_bytes: number | null;
  created_at: string;
}
