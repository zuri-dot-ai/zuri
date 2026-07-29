// ════════════════════════════════════════════════════════
//  Zuri — Content profile helpers
//  Structured brand context for every content NVIDIA prompt.
// ════════════════════════════════════════════════════════

import { serviceNames } from "@/types/brand";
import { sanitizeForPrompt } from "@/lib/utils/sanitize";

export const CONTENT_TONES = [
  "professional",
  "friendly",
  "playful",
  "bold",
  "local_pidgin",
] as const;

export type ContentTone = (typeof CONTENT_TONES)[number];

export const CONTENT_TONE_LABELS: Record<ContentTone, string> = {
  professional: "Professional",
  friendly: "Friendly",
  playful: "Playful",
  bold: "Bold",
  local_pidgin: "Local / Pidgin-friendly",
};

/** Weekday keys used by pillar posting-day patterns. */
export const POSTING_DAY_KEYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const;

export type PostingDayKey = (typeof POSTING_DAY_KEYS)[number];

export interface ContentProfile {
  primary_tone: ContentTone;
  secondary_tone: ContentTone | null;
  target_customer: string;
  key_offerings: string[];
  avoid: string;
  /** Days the business wants to post (e.g. mon/wed/fri). */
  posting_days: PostingDayKey[];
  /** Optional pillar_id per posting day. Missing days rotate through active pillars. */
  pillar_schedule: Partial<Record<PostingDayKey, string>>;
  profile_completed_at: string | null;
}

export const DEFAULT_CONTENT_PROFILE: ContentProfile = {
  primary_tone: "professional",
  secondary_tone: null,
  target_customer: "",
  key_offerings: [],
  avoid: "",
  posting_days: ["mon", "wed", "fri"],
  pillar_schedule: {},
  profile_completed_at: null,
};

const LEGACY_TONE_MAP: Record<string, ContentTone> = {
  professional: "professional",
  warm: "friendly",
  friendly: "friendly",
  playful: "playful",
  bold: "bold",
  local_pidgin: "local_pidgin",
  "local/pidgin": "local_pidgin",
  pidgin: "local_pidgin",
};

export function normalizeContentTone(raw: unknown): ContentTone {
  if (typeof raw !== "string") return "professional";
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
  return LEGACY_TONE_MAP[key] ?? LEGACY_TONE_MAP[raw.trim().toLowerCase()] ?? "professional";
}

function isPostingDayKey(v: unknown): v is PostingDayKey {
  return typeof v === "string" && (POSTING_DAY_KEYS as readonly string[]).includes(v);
}

/** Parse jsonb from DB; fill gaps from legacy flat brand columns. */
export function parseContentProfile(
  raw: unknown,
  legacy?: {
    brand_tone?: string | null;
    target_audience?: string | null;
    services?: unknown;
  }
): ContentProfile {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const offeringsFromProfile = Array.isArray(obj.key_offerings)
    ? obj.key_offerings
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];

  const offerings =
    offeringsFromProfile.length > 0
      ? offeringsFromProfile
      : serviceNames(legacy?.services).slice(0, 5);

  const postingDays = Array.isArray(obj.posting_days)
    ? obj.posting_days.filter(isPostingDayKey)
    : [];

  const scheduleRaw =
    obj.pillar_schedule &&
    typeof obj.pillar_schedule === "object" &&
    !Array.isArray(obj.pillar_schedule)
      ? (obj.pillar_schedule as Record<string, unknown>)
      : {};

  const pillar_schedule: Partial<Record<PostingDayKey, string>> = {};
  for (const day of POSTING_DAY_KEYS) {
    const id = scheduleRaw[day];
    if (typeof id === "string" && id.trim()) pillar_schedule[day] = id.trim();
  }

  const primary = normalizeContentTone(
    obj.primary_tone ?? legacy?.brand_tone ?? "professional"
  );
  let secondary: ContentTone | null = null;
  if (obj.secondary_tone != null && obj.secondary_tone !== "") {
    const s = normalizeContentTone(obj.secondary_tone);
    if (s !== primary) secondary = s;
  }

  return {
    primary_tone: primary,
    secondary_tone: secondary,
    target_customer:
      typeof obj.target_customer === "string" && obj.target_customer.trim()
        ? obj.target_customer.trim()
        : (legacy?.target_audience ?? "").trim(),
    key_offerings: offerings,
    avoid: typeof obj.avoid === "string" ? obj.avoid.trim() : "",
    posting_days:
      postingDays.length > 0 ? postingDays : [...DEFAULT_CONTENT_PROFILE.posting_days],
    pillar_schedule,
    profile_completed_at:
      typeof obj.profile_completed_at === "string" ? obj.profile_completed_at : null,
  };
}

/** True when the user has filled enough fields for "complete" status. */
export function isContentProfileComplete(profile: ContentProfile): boolean {
  if (profile.profile_completed_at) return true;
  return (
    profile.target_customer.trim().length >= 12 &&
    profile.key_offerings.length >= 1 &&
    Boolean(profile.primary_tone)
  );
}

/** Mark complete when required fields are present. */
export function withCompletedAt(profile: ContentProfile): ContentProfile {
  if (!isContentProfileComplete({ ...profile, profile_completed_at: null })) {
    return { ...profile, profile_completed_at: null };
  }
  return {
    ...profile,
    profile_completed_at: profile.profile_completed_at ?? new Date().toISOString(),
  };
}

/** Serialize for DB write (strip undefined). */
export function serializeContentProfile(profile: ContentProfile): ContentProfile {
  return withCompletedAt({
    primary_tone: profile.primary_tone,
    secondary_tone: profile.secondary_tone,
    target_customer: profile.target_customer.trim(),
    key_offerings: profile.key_offerings
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5),
    avoid: profile.avoid.trim(),
    posting_days:
      profile.posting_days.length > 0
        ? profile.posting_days
        : [...DEFAULT_CONTENT_PROFILE.posting_days],
    pillar_schedule: profile.pillar_schedule,
    profile_completed_at: profile.profile_completed_at,
  });
}

/** Inject into NVIDIA system/context prompts. */
export function formatContentProfileForPrompt(profile: ContentProfile): string {
  const primary = CONTENT_TONE_LABELS[profile.primary_tone] ?? profile.primary_tone;
  const secondary = profile.secondary_tone
    ? CONTENT_TONE_LABELS[profile.secondary_tone] ?? profile.secondary_tone
    : null;
  const customer =
    profile.target_customer.trim() ||
    "Nigerian small-business customers (infer a specific segment)";
  const offerings =
    profile.key_offerings.length > 0
      ? profile.key_offerings.join("; ")
      : "(infer from industry)";
  const avoid = profile.avoid.trim() || "None specified";

  return [
    `CONTENT PROFILE:`,
    `- Primary tone: ${sanitizeForPrompt(primary)}`,
    secondary ? `- Secondary tone (use lightly): ${sanitizeForPrompt(secondary)}` : null,
    `- Target customer: ${sanitizeForPrompt(customer)}`,
    `- Key products/services: ${sanitizeForPrompt(offerings)}`,
    `- Avoid (never do these): ${sanitizeForPrompt(avoid)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const JS_DAY_TO_POSTING_KEY: Record<number, PostingDayKey | null> = {
  0: null, // Sunday — typically skip
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

export function postingKeyForDate(d: Date): PostingDayKey | null {
  return JS_DAY_TO_POSTING_KEY[d.getDay()] ?? null;
}
