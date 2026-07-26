import { sanitizeText, sanitizeUrl } from "@/lib/utils/sanitize";
import type { ResolvedLink } from "@/types/website";

const SLOT_RE = /^[a-z][a-z0-9_]{0,63}$/;
const HASH_RE = /^#[a-zA-Z][\w:-]{0,127}$/;

export function isValidLinkSlot(slot: unknown): slot is string {
  return typeof slot === "string" && SLOT_RE.test(slot);
}

export function isInternalHref(href: string): boolean {
  return href.startsWith("#");
}

/**
 * Validate a site-editor link destination.
 * Allows `#section` hashes or http(s) URLs (via sanitizeUrl).
 */
export function sanitizeLinkHref(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const clean = input.trim();
  if (!clean) return null;

  if (clean.startsWith("#")) {
    if (!HASH_RE.test(clean)) return null;
    if (/javascript:/i.test(clean) || /data:/i.test(clean)) return null;
    return clean;
  }

  // Protocol-relative or bare hosts → require explicit https via sanitizeUrl
  return sanitizeUrl(clean);
}

export function defaultLinkTarget(href: string): "_blank" | "_self" {
  return isInternalHref(href) ? "_self" : "_blank";
}

export function normalizeResolvedLink(raw: unknown): ResolvedLink | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  const href = sanitizeLinkHref(v.href);
  if (!href) return null;

  const targetRaw = v.target;
  let target: "_blank" | "_self" | undefined;
  if (targetRaw === "_blank" || targetRaw === "_self") {
    target = targetRaw;
  } else {
    target = defaultLinkTarget(href);
  }

  // Internal links always stay in-page
  if (isInternalHref(href)) {
    target = "_self";
  }

  const label =
    typeof v.label === "string" && v.label.trim()
      ? sanitizeText(v.label).slice(0, 80)
      : undefined;

  const out: ResolvedLink = { href, target };
  if (label) out.label = label;
  return out;
}

export function normalizeFilledLinks(
  raw: unknown
): Record<string, ResolvedLink> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, ResolvedLink> = {};
  for (const [slot, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isValidLinkSlot(slot)) continue;
    const link = normalizeResolvedLink(value);
    if (link) out[slot] = link;
  }
  return out;
}

export function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
