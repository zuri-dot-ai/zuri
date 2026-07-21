import type { CSSProperties } from "react";

/**
 * Design tokens — single source of truth for the Content section (and any
 * surface that wants the same restrained, Linear-style visual language).
 *
 * CSS custom properties in globals.css remain authoritative for raw values
 * (radius px, elevation shadows, font stacks) — the constants below either
 * reference those vars directly or mirror them exactly so there is never a
 * second, drifting set of numbers. Never hardcode a spacing/radius/timing
 * value inline; import from here instead.
 */

/** Strict 4px spacing scale. Every padding/margin/gap in touched components
 * must map to one of these. */
export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  6: "24px",
  8: "32px",
  12: "48px",
  16: "64px",
} as const;

/** Mirrors --radius-sm/md/lg in globals.css. Use `card` for cards/panels,
 * `pill` for badges/buttons/chips — never mix radii across sibling
 * components. */
export const radius = {
  pill: "var(--radius-sm)",
  card: "var(--radius-md)",
  panel: "var(--radius-lg)",
} as const;

/** One timing curve for every hover/focus transition this session touches. */
export const transition = {
  fast: "140ms cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

export const gold = {
  DEFAULT: "#C9A84C",
  bright: "#D4B55F",
  muted: "rgba(201, 168, 76, 0.18)",
} as const;

/**
 * Status colors — always rendered as a small dot + text, never a full
 * badge background fill (Linear-style restraint). `generated` intentionally
 * reuses the brand gold accent to tie "AI-completed" to the signature color.
 */
export const statusColors: Record<
  string,
  { dot: string; text: string; border: string; label: string }
> = {
  draft: {
    dot: "#8A93A6",
    text: "text-slate-300",
    border: "border-slate-500/30",
    label: "Draft",
  },
  approved: {
    dot: "#3D9970",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    label: "Approved",
  },
  generated: {
    dot: gold.DEFAULT,
    text: "text-[#C9A84C]",
    border: "border-[#C9A84C]/30",
    label: "Generated",
  },
  posted: {
    dot: "#9B59B6",
    text: "text-violet-400",
    border: "border-violet-500/30",
    label: "Posted",
  },
  skipped: {
    dot: "#C0392B",
    text: "text-red-400",
    border: "border-red-500/30",
    label: "Skipped",
  },
  coming_soon: {
    dot: "#9B59B6",
    text: "text-violet-400",
    border: "border-violet-500/30",
    label: "Coming Soon",
  },
  needs_review: {
    dot: "#E2A83A",
    text: "text-amber-400",
    border: "border-amber-500/30",
    label: "Needs review",
  },
};

export function statusStyle(slot: { status: string; coming_soon?: boolean }) {
  return slot.coming_soon
    ? statusColors.coming_soon
    : statusColors[slot.status] ?? statusColors.draft;
}

/** Left-edge pillar accent stripe — the per-card, per-pillar traceability
 * cue. Falls back to gold only when a slot genuinely has no pillar. */
export function pillarStripeStyle(color?: string | null): CSSProperties {
  return { boxShadow: `inset 3px 0 0 0 ${color ?? gold.DEFAULT}` };
}
