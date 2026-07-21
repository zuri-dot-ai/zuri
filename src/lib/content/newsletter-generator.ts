import { geminiJSON } from "@/lib/gemini";
import { createServiceClient } from "@/lib/supabase/service";
import { sanitizeForPrompt } from "@/lib/utils/sanitize";
import type { BusinessProfile } from "@/types/brand";
import type { GenerationInput, NewsletterContent } from "./types";
import { getVoiceContext } from "./voice-bank";

export async function generateNewsletter(
  input: GenerationInput
): Promise<NewsletterContent> {
  const businessName = sanitizeForPrompt(input.brand.business_name);
  const industry = sanitizeForPrompt(input.brand.industry);
  const topic = sanitizeForPrompt(input.topic);
  const brief = sanitizeForPrompt(input.brief);
  const brandTone = sanitizeForPrompt(input.brand.brand_tone);
  const audience = sanitizeForPrompt(input.brand.target_audience);

  let voiceContext = "";
  try {
    const supabase = createServiceClient();
    voiceContext = await getVoiceContext(supabase, input.userId);
  } catch (err) {
    console.error("[generateNewsletter] voice context failed:", err);
  }

  const prompt = `
You are writing an email newsletter for ${businessName}, a ${industry} in Nigeria.
Newsletter topic: ${topic}
Brief: ${brief}
Brand tone: ${brandTone}
${voiceContext}
Audience: ${audience}

Write a complete email newsletter that subscribers will actually want to read.

Rules:
- Subject line: max 50 chars. Creates curiosity or urgency. Not clickbait. Specific to this business.
- Preheader: max 90 chars. Complements the subject line.
- Length: 300-500 words total (readers scan newsletters, keep it tight)
- Tone: warm, direct, valuable — like a message from a trusted business owner
- Every section must be specific to ${businessName} — no generic content
- Include ONE primary CTA that drives a clear action (book, buy, read, visit)
- Nigerian/African context: reference local culture, events, or seasons where relevant
- Close warmly — sign off as the brand

Output ONLY valid JSON:
{
  "subject": "Email subject (max 50 chars)",
  "preheader": "Preview text (max 90 chars)",
  "sections": [
    {
      "type": "hero",
      "headline": "Main newsletter headline",
      "subheadline": "Supporting sentence"
    },
    {
      "type": "main_content",
      "content": "Main body of the newsletter (150-250 words)",
      "image_suggestion": "Brief description of an ideal image for this section"
    },
    {
      "type": "featured_item",
      "headline": "Feature headline (service, product, offer, or story)",
      "content": "Brief description (50-80 words)",
      "cta_text": "CTA text (max 5 words)",
      "cta_url": "#"
    },
    {
      "type": "closing",
      "content": "Warm closing (40-60 words). Sign off as the business."
    }
  ],
  "footer_tagline": "Brand tagline or closing phrase",
  "estimated_read_time": "2 min read"
}
`;

  let newsletter: NewsletterContent;
  try {
    newsletter = await geminiJSON<NewsletterContent>(prompt, "pro");
  } catch (err) {
    console.warn("Newsletter Pro generation failed, falling back to Flash:", err);
    newsletter = await geminiJSON<NewsletterContent>(prompt, "flash");
  }

  if (newsletter.subject?.length > 50) {
    newsletter.subject = newsletter.subject.slice(0, 50);
  }
  if (newsletter.preheader?.length > 90) {
    newsletter.preheader = newsletter.preheader.slice(0, 90);
  }

  return newsletter;
}

export function newsletterContentToHTML(
  newsletter: NewsletterContent,
  brand: Pick<BusinessProfile, "business_name" | "tagline">
): string {
  const sections = (newsletter.sections ?? [])
    .map((s) => {
      if (s.type === "hero") {
        return `<h1>${escapeHtml(s.headline ?? "")}</h1><p>${escapeHtml(s.subheadline ?? "")}</p>`;
      }
      if (s.type === "tips_list" && s.items?.length) {
        return `<h2>${escapeHtml(s.headline ?? "Tips")}</h2><ul>${s.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
      }
      if (s.type === "featured_item") {
        return `<h2>${escapeHtml(s.headline ?? "")}</h2><p>${escapeHtml(s.content ?? "")}</p><p><a href="${escapeHtml(s.cta_url ?? "#")}">${escapeHtml(s.cta_text ?? "Learn more")}</a></p>`;
      }
      return `<p>${escapeHtml(s.content ?? "")}</p>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(newsletter.subject)}</title>
</head>
<body>
  <p style="color:#666;font-size:12px">${escapeHtml(newsletter.preheader)}</p>
  ${sections}
  <hr />
  <p><em>${escapeHtml(newsletter.footer_tagline || brand.tagline || brand.business_name)}</em></p>
  <p style="color:#999;font-size:12px">${escapeHtml(newsletter.estimated_read_time)}</p>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
