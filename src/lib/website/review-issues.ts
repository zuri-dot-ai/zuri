/**
 * Client-side review checklist mirroring validateFilledHtml + empty required fields.
 */

import { isBrokenImageUrl } from "@/lib/website/image-url";
import type { ResolvedImage } from "@/types/website";

export interface ReviewIssue {
  id: string;
  label: string;
  /** Section panel id to expand */
  sectionId: string;
  /** Field key or image slot to focus */
  target: string;
  kind: "placeholder" | "image";
}

export function buildReviewIssues(
  placeholders: Record<string, string>,
  images: Record<string, ResolvedImage>,
  imageSlots: string[]
): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  for (const [key, value] of Object.entries(placeholders)) {
    if (key === "active_theme") continue;
    if (typeof value === "string" && /\{\{[a-z0-9_]+\}\}/i.test(value)) {
      issues.push({
        id: `ph-token-${key}`,
        label: `Unfilled token in ${key.replace(/_/g, " ")}`,
        sectionId: sectionForField(key),
        target: key,
        kind: "placeholder",
      });
    }
    // Required-ish short fields that are empty
    if (
      /^(tagline|hero_|about_body|business_name|cta_)/.test(key) &&
      !value?.trim()
    ) {
      issues.push({
        id: `ph-empty-${key}`,
        label: `${key.replace(/_/g, " ")} is empty`,
        sectionId: sectionForField(key),
        target: key,
        kind: "placeholder",
      });
    }
  }

  const slots = imageSlots.length > 0 ? imageSlots : Object.keys(images);
  for (const slot of slots) {
    const img = images[slot];
    if (!img?.url || isBrokenImageUrl(img.url)) {
      issues.push({
        id: `img-${slot}`,
        label: `Image slot “${slot.replace(/_/g, " ")}” needs a valid image`,
        sectionId: "images",
        target: slot,
        kind: "image",
      });
    }
  }

  return issues;
}

export function sectionForField(field: string): string {
  if (/^hero_|^tagline$|^cta_primary/.test(field)) return "hero";
  if (/^about_/.test(field)) return "about";
  if (/^service_\d+_/.test(field)) return "services";
  if (/^testimonial_|^faq_/.test(field)) {
    return /^faq_/.test(field) ? "faq" : "testimonials";
  }
  if (/phone|email|address|whatsapp|location|opening|map/.test(field))
    return "contact";
  if (/instagram|facebook|twitter|linkedin|tiktok|youtube/.test(field))
    return "social";
  if (/^business_/.test(field)) return "business";
  return "other";
}
