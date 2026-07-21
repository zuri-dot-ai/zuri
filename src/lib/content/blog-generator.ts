import { geminiJSON } from "@/lib/gemini";
import { createServiceClient } from "@/lib/supabase/service";
import { sanitizeForPrompt } from "@/lib/utils/sanitize";
import type { BlogContent, GenerationInput } from "./types";
import { getVoiceContext } from "./voice-bank";

export async function generateBlogPost(
  input: GenerationInput
): Promise<BlogContent> {
  const businessName = sanitizeForPrompt(input.brand.business_name);
  const industry = sanitizeForPrompt(input.brand.industry);
  const topic = sanitizeForPrompt(input.topic);
  const services = input.brand.services
    .map((s) => sanitizeForPrompt(s))
    .join(", ");
  const audience = sanitizeForPrompt(input.brand.target_audience);
  const location = sanitizeForPrompt(
    input.brand.location_city ?? input.brand.location
  );
  const brandTone = sanitizeForPrompt(input.brand.brand_tone);

  let voiceContext = "";
  try {
    const supabase = createServiceClient();
    voiceContext = await getVoiceContext(supabase, input.userId);
  } catch (err) {
    console.error("[generateBlogPost] voice context failed:", err);
  }

  const prompt = `
You are a content writer for ${businessName}, a ${industry} business in Nigeria.
Write a complete, high-quality blog post on: ${topic}

Business context:
- Services: ${services}
- Target audience: ${audience}
- Location: ${location}, Nigeria
- Brand tone: ${brandTone}
${voiceContext}
Blog post requirements:
- Total length: 800-1200 words
- Audience: ${audience}
- SEO focus: naturally include the topic as a keyword phrase
- Must be specific to the Nigerian/African context — not generic Western content
- Practical and actionable — readers should learn something useful
- Written in first-person plural (we/our) representing the business
- Title: compelling, SEO-optimized, creates curiosity or promises value
- Structure: intro → 3-5 H2 sections → conclusion with CTA

Output ONLY valid JSON (no markdown wrapping):
{
  "title": "SEO blog title (max 70 chars)",
  "meta_description": "Meta description (max 155 chars)",
  "introduction": "Opening 2-3 paragraphs (100-150 words)",
  "sections": [
    {
      "heading": "H2 section heading",
      "content": "Section body (200-300 words)"
    }
  ],
  "conclusion": "Closing paragraph with soft CTA (80-120 words)",
  "cta": {
    "text": "CTA sentence that leads to action",
    "button_label": "Action label (max 5 words)"
  },
  "suggested_tags": ["keyword1", "keyword2", "keyword3"],
  "reading_time_minutes": 5
}
`;

  let blog: BlogContent;
  try {
    blog = await geminiJSON<BlogContent>(prompt, "pro");
  } catch (err) {
    console.warn("Blog Pro generation failed, falling back to Flash:", err);
    blog = await geminiJSON<BlogContent>(prompt, "flash");
  }

  const allText = [
    blog.introduction,
    ...(blog.sections ?? []).map((s) => s.content),
    blog.conclusion,
  ].join(" ");
  blog.word_count = allText.split(/\s+/).filter(Boolean).length;

  if (blog.title?.length > 70) blog.title = blog.title.slice(0, 70);
  if (blog.meta_description?.length > 155) {
    blog.meta_description = blog.meta_description.slice(0, 155);
  }

  const fullContent = JSON.stringify(blog);
  if (/\[.*?\]|lorem ipsum|placeholder/i.test(fullContent)) {
    throw new Error(
      "Blog post contains placeholder text — regeneration required"
    );
  }

  return blog;
}

export function blogContentToMarkdown(blog: BlogContent): string {
  const sections = (blog.sections ?? [])
    .map((s) => `## ${s.heading}\n\n${s.content}`)
    .join("\n\n");
  return `# ${blog.title}

${blog.meta_description}

${blog.introduction}

${sections}

## Conclusion

${blog.conclusion}

**${blog.cta?.button_label ?? "Learn more"}:** ${blog.cta?.text ?? ""}
`;
}

export function blogContentToHTML(blog: BlogContent): string {
  const sections = (blog.sections ?? [])
    .map(
      (s) =>
        `<h2>${escapeHtml(s.heading)}</h2><p>${escapeHtml(s.content).replace(/\n\n/g, "</p><p>")}</p>`
    )
    .join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(blog.title)}</title>
  <meta name="description" content="${escapeHtml(blog.meta_description)}" />
</head>
<body>
  <article>
    <h1>${escapeHtml(blog.title)}</h1>
    <p>${escapeHtml(blog.introduction).replace(/\n\n/g, "</p><p>")}</p>
    ${sections}
    <h2>Conclusion</h2>
    <p>${escapeHtml(blog.conclusion)}</p>
    <p><strong>${escapeHtml(blog.cta?.button_label ?? "")}</strong> — ${escapeHtml(blog.cta?.text ?? "")}</p>
  </article>
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
