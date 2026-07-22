import { geminiJSON } from "@/lib/gemini";
import { sanitizeForPrompt } from "@/lib/utils/sanitize";

export interface RawOnboardingData {
  businessName: string;
  businessType: string;
  services: string[];
  audienceTypes: string[];
  location: string;
  locationCity?: string;
  brandVibe: string;
  pitchLine?: string;
  primaryGoal?: string;
  toneSampleChoice?: string;
}

export interface EnrichedBrandProfile {
  industry: string;
  unique_value: string;
  brand_tone: string;
  tagline_suggestion: string;
  color_primary_suggestion: string;
  color_accent_suggestion: string;
  target_audience_refined: string;
}

export async function extractBrandProfile(
  data: RawOnboardingData
): Promise<EnrichedBrandProfile> {
  const businessName = sanitizeForPrompt(data.businessName);
  const businessType = sanitizeForPrompt(data.businessType);
  const services = data.services.map((s) => sanitizeForPrompt(s)).filter(Boolean);
  const audienceTypes = data.audienceTypes
    .map((a) => sanitizeForPrompt(a))
    .filter(Boolean);
  const brandVibe = sanitizeForPrompt(data.brandVibe);
  const locationCity = data.locationCity
    ? sanitizeForPrompt(data.locationCity)
    : undefined;
  const location = sanitizeForPrompt(data.location);
  const pitchLine = data.pitchLine ? sanitizeForPrompt(data.pitchLine) : undefined;
  const primaryGoal = data.primaryGoal
    ? sanitizeForPrompt(data.primaryGoal)
    : undefined;
  const toneSampleChoice = data.toneSampleChoice
    ? sanitizeForPrompt(data.toneSampleChoice)
    : undefined;

  const locationLabel = locationCity
    ? `${locationCity}, Nigeria`
    : location === "nationwide"
      ? "Nigeria (nationwide)"
      : location === "international"
        ? "International market"
        : `${location}, Nigeria`;

  const prompt = `
You are a brand strategist specialising in African small businesses. Given the data below
from a Nigerian entrepreneur, output a clean, specific brand profile.

Business name: ${businessName}
Business type: ${businessType}
Services offered: ${services.join(", ")}
Target audience: ${audienceTypes.join(", ")}
Location: ${locationLabel}
Desired brand vibe: ${brandVibe}
${pitchLine ? `Owner's own pitch line / differentiator: "${pitchLine}" — treat this as ground truth for unique_value and tagline, don't contradict it.` : ""}
${primaryGoal ? `Primary business goal: ${primaryGoal}` : ""}
${toneSampleChoice ? `Preferred tone sample (match this register): "${toneSampleChoice}"` : ""}

Output ONLY valid JSON with these exact keys. No markdown, no preamble, no explanation:
{
  "industry": "clean industry category (e.g. 'Food & Beverage', 'Beauty & Personal Care', 'Legal Services')",
  "unique_value": "one specific sentence about what makes this business valuable. Must mention the business name.",
  "brand_tone": "exactly one of: professional | friendly | bold | elegant | energetic | trustworthy",
  "tagline_suggestion": "a memorable 5-9 word tagline specific to this business. Not generic.",
  "color_primary_suggestion": "#hex — a primary brand color appropriate for the vibe and industry",
  "color_accent_suggestion": "#hex — a complementary accent color",
  "target_audience_refined": "a 1-2 sentence description of the ideal customer for this business in Nigeria"
}

Rules:
- tagline must NOT be a cliché like 'Quality you can trust' or 'Excellence in everything'
- tagline must feel earned by THIS specific business
- color_primary must contrast well against a near-black (#0C0C0E) background
- brand_tone must be exactly one of the six options listed, nothing else
- Do not fabricate specific claims (no revenue figures, no years in business) unless given
`;

  return geminiJSON<EnrichedBrandProfile>(prompt, "flash");
}
