# ZURI — CONTENT STRATEGY SYSTEM
# Complete specification for the AI content calendar, content pillar system,
# trending topics engine, Nigerian cultural calendar, series generator,
# repurpose engine, and performance feedback loop

---

## 1. SYSTEM OVERVIEW

The content strategy system answers one question for every Zuri user: **what should I post, where, and when?**

It is NOT a content generator — that is a separate system (see 04_CONTENT_GENERATION.md). This system produces structured BRIEFS and a CALENDAR. Each brief tells the user (or the generation system) exactly what to create. The actual caption, image, or blog post is produced downstream.

The strategy layer has five components:
1. **Content Pillar System** — the structural framework for every business's content identity
2. **Monthly Calendar Engine** — AI-generated posting plan for any given month
3. **Nigerian Cultural Calendar** — automatic injection of relevant local moments
4. **Trending Topics Engine** — Gemini + web search to surface current relevance
5. **Repurpose Engine** — adapts one idea across multiple platforms
6. **Performance Feedback Loop** — Growth/Premium: past data informs future calendar (Meta API)
7. **Content Series Generator** — multi-part planned series for sustained engagement

---

## 2. CONTENT PILLAR SYSTEM

Content pillars are the 3–5 recurring themes a business posts about. They give the calendar structure, ensure brand variety, and prevent the user from staring at a blank page wondering what to say. Pillars are assigned automatically during onboarding based on archetype, then editable by the user.

### 2.1 Default Pillars by Archetype

```typescript
// src/lib/content/pillars.ts

export const DEFAULT_PILLARS: Record<string, PillarDefinition[]> = {
  "warm-sensory": [
    { name: "Product Showcase", description: "Show off what you make or serve", icon: "Star", color: "#E2843A" },
    { name: "Behind the Scenes", description: "Let people see the process", icon: "Camera", color: "#C9A84C" },
    { name: "Customer Love", description: "Share reviews, testimonials, and reactions", icon: "Heart", color: "#D94F4F" },
    { name: "Tips & Recipes", description: "Educate and add value", icon: "Lightbulb", color: "#4FA8D9" },
    { name: "Local Stories", description: "Celebrate the community you serve", icon: "MapPin", color: "#4DA86E" },
  ],
  "authority-minimal": [
    { name: "Expert Insights", description: "Share your professional knowledge", icon: "Brain", color: "#C9A84C" },
    { name: "Client Success", description: "Results you have achieved for clients", icon: "Trophy", color: "#E2843A" },
    { name: "Industry News", description: "Commentary on what is happening in your field", icon: "Newspaper", color: "#4FA8D9" },
    { name: "Behind the Firm", description: "Team, culture, and process", icon: "Building2", color: "#4DA86E" },
    { name: "FAQs & Myth-busting", description: "Answer common questions authoritatively", icon: "HelpCircle", color: "#9B59B6" },
  ],
  "luxury-aspirational": [
    { name: "Service Glamour", description: "Aspirational shots of your work and space", icon: "Sparkles", color: "#C9A84C" },
    { name: "Transformation Stories", description: "Before and after, with permission", icon: "ArrowUpRight", color: "#E2843A" },
    { name: "Behind the Brand", description: "The craftsmanship and care that goes in", icon: "Gem", color: "#9B59B6" },
    { name: "Lifestyle Inspiration", description: "The world your brand belongs to", icon: "Sun", color: "#D94F4F" },
    { name: "Client Features", description: "Celebrate your clients", icon: "Users", color: "#4DA86E" },
  ],
  "editorial-bold": [
    { name: "Product Drops", description: "New arrivals, launches, restocks", icon: "ShoppingBag", color: "#E2843A" },
    { name: "Brand Story", description: "Why this brand exists and what it stands for", icon: "Flame", color: "#D94F4F" },
    { name: "Style Inspiration", description: "Looks, outfits, editorial shots", icon: "Palette", color: "#C9A84C" },
    { name: "Community", description: "Customers, supporters, collabs", icon: "Users", color: "#4DA86E" },
    { name: "Nigerian Culture", description: "Nigerian identity, pride, and culture", icon: "Globe", color: "#4FA8D9" },
  ],
  "clean-modern": [
    { name: "Product Features", description: "What your product or service does", icon: "Zap", color: "#C9A84C" },
    { name: "Tech Tips", description: "Helpful knowledge for your audience", icon: "Lightbulb", color: "#4FA8D9" },
    { name: "Team Stories", description: "The people behind the product", icon: "Users", color: "#4DA86E" },
    { name: "Industry Insights", description: "Trends and perspectives from your field", icon: "BarChart3", color: "#E2843A" },
    { name: "Customer Success", description: "Real outcomes your product delivered", icon: "Trophy", color: "#9B59B6" },
  ],
  "portfolio-dramatic": [
    { name: "Work Showcase", description: "Your best projects and outcomes", icon: "Camera", color: "#C9A84C" },
    { name: "Process", description: "How you think and how you work", icon: "PenLine", color: "#E2843A" },
    { name: "Client Collaboration", description: "Stories from working with clients", icon: "Handshake", color: "#4DA86E" },
    { name: "Creative Inspiration", description: "What influences your work", icon: "Palette", color: "#9B59B6" },
    { name: "Personal Brand", description: "Your story, your voice, your perspective", icon: "User", color: "#D94F4F" },
  ],
  "community-vibrant": [
    { name: "Transformations", description: "Real results from real members", icon: "ArrowUpRight", color: "#E2843A" },
    { name: "Motivation", description: "Energise and inspire your community", icon: "Flame", color: "#D94F4F" },
    { name: "Community Highlights", description: "Celebrate your members and community", icon: "Users", color: "#4DA86E" },
    { name: "Tips & Education", description: "Teach your audience something useful", icon: "Lightbulb", color: "#C9A84C" },
    { name: "Events & Classes", description: "Promote upcoming sessions and events", icon: "CalendarCheck", color: "#4FA8D9" },
  ],
  "trust-professional": [
    { name: "Health & Wellness Tips", description: "Educational content your audience needs", icon: "Heart", color: "#4DA86E" },
    { name: "Patient Education", description: "Explain what you do and why it matters", icon: "BookOpen", color: "#4FA8D9" },
    { name: "Team Profiles", description: "Introduce your qualified team", icon: "Users", color: "#C9A84C" },
    { name: "Community Health", description: "Local health news and initiatives", icon: "Globe", color: "#E2843A" },
    { name: "Services Overview", description: "Explain what you offer and who it is for", icon: "Briefcase", color: "#9B59B6" },
  ],
};
```

### 2.2 Pillar Seeding (runs once after onboarding)

```typescript
// src/lib/content/seed-pillars.ts

export async function seedContentPillars(
  supabase: SupabaseClient,
  userId: string,
  archetype: string
): Promise<void> {
  const pillars = DEFAULT_PILLARS[archetype] ?? DEFAULT_PILLARS["authority-minimal"];

  const rows = pillars.map((p, index) => ({
    user_id: userId,
    name: p.name,
    description: p.description,
    icon: p.icon,
    color: p.color,
    is_active: true,
    sort_order: index,
  }));

  await supabase.from("content_pillars").insert(rows);
}
```

### 2.3 Pillar Rules
- Minimum 2 active pillars required at all times
- Maximum 6 pillars
- Pillar names: min 2 chars, max 50 chars
- Pillar descriptions: max 120 chars
- User can add, edit, deactivate, or reorder pillars at any time
- Deactivated pillars are not used in calendar generation but their existing slots remain
- Deleting a pillar: only allowed if no approved/generated calendar slots reference it. If slots exist: show warning "X upcoming posts use this pillar. Delete anyway?" → if confirmed, those slots get pillar_id = null and are flagged for review

---

## 3. MONTHLY CALENDAR ENGINE

### 3.1 Calendar Generation Logic

```typescript
// src/lib/content/calendar-generator.ts

export interface CalendarGenerationInput {
  userId: string;
  month: number;          // 1-12
  year: number;
  brand: BusinessProfile;
  pillars: ContentPillar[];
  platforms: string[];    // user's selected platforms (plan-limited)
  postsPerMonth: number;  // from plan limits (12 | 30 | null)
  existingSlots?: string[]; // dates already occupied, to avoid duplicates
}

export async function generateMonthlyCalendar(
  input: CalendarGenerationInput
): Promise<CalendarSlot[]> {
  const { month, year, brand, pillars, platforms, postsPerMonth } = input;

  // Step 1: Get cultural moments for this month
  const culturalMoments = getNigerianCulturalMoments(month, year);

  // Step 2: Get trending topics (Gemini + web search)
  const trends = await getTrendingTopics(brand.industry, brand.location);

  // Step 3: Calculate distribution
  const totalPosts = postsPerMonth === null ? 30 : postsPerMonth; // cap unlimited at 30 per AI call
  const distribution = distributePostsAcrossPlatforms(totalPosts, platforms);
  const pillarRotation = rotatePillars(pillars, totalPosts);
  const scheduledDates = distributeDatesAcrossMonth(month, year, totalPosts);
  const formatsDistribution = distributeFormats(totalPosts, platforms);

  // Step 4: Build the generation prompt
  const calendarPrompt = buildCalendarPrompt({
    brand,
    pillars,
    platforms,
    culturalMoments,
    trends,
    totalPosts,
    distribution,
    month,
    year,
  });

  // Step 5: Call Gemini to generate the calendar
  const generated = await geminiJSON<{ slots: GeneratedSlot[] }>(calendarPrompt, "flash");

  // Step 6: Merge AI output with pre-calculated structure
  return mergeCalendarOutput(
    generated.slots,
    pillarRotation,
    scheduledDates,
    formatsDistribution,
    culturalMoments,
    input.userId
  );
}
```

### 3.2 Platform Distribution Logic

```typescript
function distributePostsAcrossPlatforms(
  total: number,
  platforms: string[]
): Record<string, number> {
  if (platforms.length === 0) return {};

  // Platform weight — prioritise where the audience is most active in Nigeria
  const PLATFORM_WEIGHTS: Record<string, number> = {
    instagram: 3,
    facebook: 3,
    tiktok: 2,
    x: 2,
    linkedin: 1,
  };

  const activeWeights = platforms.reduce((acc, p) => {
    acc[p] = PLATFORM_WEIGHTS[p] ?? 1;
    return acc;
  }, {} as Record<string, number>);

  const totalWeight = Object.values(activeWeights).reduce((a, b) => a + b, 0);
  const distribution: Record<string, number> = {};

  let assigned = 0;
  platforms.forEach((platform, i) => {
    if (i === platforms.length - 1) {
      // Give remainder to last platform
      distribution[platform] = total - assigned;
    } else {
      const share = Math.round((activeWeights[platform] / totalWeight) * total);
      distribution[platform] = share;
      assigned += share;
    }
  });

  return distribution;
}
```

### 3.3 Post Format Distribution

```typescript
// Formats by platform (video formats marked as coming_soon — show in calendar as planned but not generatable yet)
const PLATFORM_FORMATS: Record<string, PostFormat[]> = {
  instagram: [
    { type: "static_image", weight: 3, label: "Image Post" },
    { type: "carousel", weight: 2, label: "Carousel" },
    { type: "reel", weight: 2, label: "Reel", coming_soon: true },
    { type: "story", weight: 1, label: "Story" },
  ],
  facebook: [
    { type: "static_image", weight: 3, label: "Image Post" },
    { type: "text_post", weight: 2, label: "Text Post" },
    { type: "video", weight: 1, label: "Video", coming_soon: true },
  ],
  linkedin: [
    { type: "text_post", weight: 3, label: "Text Post" },
    { type: "static_image", weight: 2, label: "Image Post" },
    { type: "article", weight: 1, label: "Article" },
    { type: "poll", weight: 1, label: "Poll" },
  ],
  x: [
    { type: "text_post", weight: 3, label: "Tweet" },
    { type: "static_image", weight: 2, label: "Image Tweet" },
    { type: "thread", weight: 1, label: "Thread" },
  ],
  tiktok: [
    { type: "short_video", weight: 1, label: "Short Video", coming_soon: true },
  ],
};
```

### 3.4 Date Distribution Logic

```typescript
function distributeDatesAcrossMonth(
  month: number,
  year: number,
  total: number
): Date[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const startDay = (month === today.getMonth() + 1 && year === today.getFullYear())
    ? today.getDate() + 1  // start from tomorrow if current month
    : 1;

  const availableDays = Array.from(
    { length: daysInMonth - startDay + 1 },
    (_, i) => startDay + i
  );

  // Spread evenly, slightly biased toward mid-week (Tue–Thu for LinkedIn, any for others)
  const interval = Math.max(1, Math.floor(availableDays.length / total));
  const dates: Date[] = [];

  for (let i = 0; i < total && i * interval < availableDays.length; i++) {
    const day = availableDays[Math.min(i * interval, availableDays.length - 1)];
    dates.push(new Date(year, month - 1, day));
  }

  return dates;
}
```

### 3.5 Calendar Generation Prompt

```typescript
function buildCalendarPrompt(params: CalendarPromptParams): string {
  const { brand, pillars, platforms, culturalMoments, trends, totalPosts, distribution, month, year } = params;

  const monthName = new Date(year, month - 1, 1).toLocaleString("en-NG", { month: "long" });

  return `
You are a social media strategist specialising in Nigerian small businesses.
Create a ${totalPosts}-post content calendar for ${monthName} ${year} for the business below.

BUSINESS:
- Name: ${brand.business_name}
- Industry: ${brand.industry}
- Services: ${brand.services.join(", ")}
- Location: ${brand.location_city ?? brand.location}, Nigeria
- Target audience: ${brand.target_audience}
- Brand tone: ${brand.brand_tone}

CONTENT PILLARS (rotate through these):
${pillars.map(p => `- ${p.name}: ${p.description}`).join("\n")}

PLATFORM DISTRIBUTION (total posts per platform this month):
${Object.entries(distribution).map(([p, n]) => `- ${p}: ${n} posts`).join("\n")}

NIGERIAN CULTURAL MOMENTS THIS MONTH (must include at least one post for each applicable moment):
${culturalMoments.length > 0
  ? culturalMoments.map(m => `- ${m.date}: ${m.name} — ${m.content_angle}`).join("\n")
  : "None this month"}

TRENDING TOPICS IN THIS INDUSTRY RIGHT NOW:
${trends.slice(0, 3).map(t => `- ${t.topic}: ${t.angle}`).join("\n")}

RULES:
1. Every slot must have a unique, specific topic — no two slots can have the same topic
2. Every post must be directly relevant to ${brand.business_name} and its audience
3. Topics must feel authentic to a Nigerian audience — reference local context, language, and culture where natural
4. Do NOT schedule posts on Sundays unless specifically for a cultural moment
5. Rotate through content pillars — no pillar should appear more than twice in a row
6. Each slot must include a specific HOOK — the first line the audience will read or see
7. Video format slots: mark as coming_soon: true — these appear in the calendar but cannot be generated yet
8. At least 20% of posts should be engagement-driven (questions, polls, challenges, opinions)

Output ONLY valid JSON with no markdown:
{
  "slots": [
    {
      "platform": "instagram",
      "format_type": "static_image",
      "pillar_name": "Product Showcase",
      "topic": "specific and descriptive topic",
      "hook": "specific opening hook or question (max 15 words)",
      "brief": "2-3 sentence description of what this post should say and show",
      "coming_soon": false,
      "is_cultural_moment": false,
      "cultural_moment_name": null,
      "suggested_day_of_week": "Tuesday"
    }
  ]
}
`;
}
```

### 3.6 Pillar Rotation Algorithm

```typescript
function rotatePillars(pillars: ContentPillar[], total: number): string[] {
  const activePillars = pillars.filter(p => p.is_active);
  if (activePillars.length === 0) return [];

  const rotation: string[] = [];
  for (let i = 0; i < total; i++) {
    rotation.push(activePillars[i % activePillars.length].id);
  }
  return rotation;
}
```

---

## 4. NIGERIAN CULTURAL CALENDAR

Built-in awareness of Nigerian cultural moments. This is a STATIC dataset (no AI needed) that is injected into every calendar generation call and flagged on the calendar UI.

```typescript
// src/lib/content/cultural-calendar.ts

export interface CulturalMoment {
  name: string;
  date: string;           // YYYY-MM-DD or "variable" for floating dates
  month: number;
  day?: number;           // null for floating dates
  is_floating: boolean;   // true for Islamic dates, Easter, etc.
  applicable_to: DesignArchetype[] | "all";
  content_angle: string;  // Suggested content angle for businesses
  urgency: "high" | "medium" | "low"; // how important it is to post
}

export const NIGERIAN_CULTURAL_CALENDAR: CulturalMoment[] = [
  // JANUARY
  { name: "New Year's Day", month: 1, day: 1, is_floating: false, applicable_to: "all", content_angle: "New year goals, fresh starts, what your business is doing differently this year", urgency: "high" },
  { name: "Back to School", month: 1, day: 8, is_floating: false, applicable_to: ["trust-professional", "authority-minimal", "clean-modern"], content_angle: "New term, new goals — relevant for educational or family-focused businesses", urgency: "medium" },

  // FEBRUARY
  { name: "Valentine's Day", month: 2, day: 14, is_floating: false, applicable_to: "all", content_angle: "Gift ideas, self-love, couples — adapt to your business type", urgency: "high" },

  // MARCH
  { name: "International Women's Day", month: 3, day: 8, is_floating: false, applicable_to: "all", content_angle: "Celebrate women — team, customers, or founder story", urgency: "high" },
  { name: "Holi / Colours Festival", month: 3, day: 10, is_floating: true, applicable_to: ["luxury-aspirational", "editorial-bold", "portfolio-dramatic"], content_angle: "Colour, vibrancy, creativity — visual brands can lean into this", urgency: "low" },

  // APRIL
  { name: "Easter Sunday", month: 4, day: 1, is_floating: true, applicable_to: "all", content_angle: "Celebration, renewal, family — warm and community-focused", urgency: "high" },
  { name: "Good Friday", month: 4, day: -2, is_floating: true, applicable_to: "all", content_angle: "Reflective tone — keep posts warm but understated", urgency: "medium" },

  // MAY
  { name: "Workers' Day / Labour Day", month: 5, day: 1, is_floating: false, applicable_to: "all", content_angle: "Celebrate your team and the work you do. Acknowledge your workers.", urgency: "medium" },
  { name: "Mother's Day", month: 5, day: 12, is_floating: true, applicable_to: "all", content_angle: "Celebrate mothers — gifts, experiences, or dedications", urgency: "high" },
  { name: "Africa Day", month: 5, day: 25, is_floating: false, applicable_to: "all", content_angle: "African pride, continent-wide identity, pan-African narrative", urgency: "medium" },

  // JUNE
  { name: "Eid al-Adha (Sallah)", month: 6, day: 1, is_floating: true, applicable_to: "all", content_angle: "Celebrate Sallah — warm wishes, community, food, family. Very high engagement in Nigeria.", urgency: "high" },
  { name: "Father's Day", month: 6, day: 16, is_floating: true, applicable_to: "all", content_angle: "Celebrate fathers — gifts, experiences, dedications", urgency: "high" },

  // OCTOBER
  { name: "Nigeria Independence Day", month: 10, day: 1, is_floating: false, applicable_to: "all", content_angle: "Nigerian pride, national identity, love for the country. One of the most important days to post.", urgency: "high" },
  { name: "Breast Cancer Awareness Month", month: 10, day: 1, is_floating: false, applicable_to: ["trust-professional", "community-vibrant"], content_angle: "Health awareness — early detection, self-checks, support stories", urgency: "medium" },
  { name: "World Mental Health Day", month: 10, day: 10, is_floating: false, applicable_to: ["trust-professional", "community-vibrant", "authority-minimal"], content_angle: "Mental wellness, breaking stigma, resources", urgency: "medium" },

  // NOVEMBER
  { name: "Black Friday", month: 11, day: 29, is_floating: true, applicable_to: ["editorial-bold", "luxury-aspirational", "warm-sensory"], content_angle: "Promotions, deals, special offers — even service businesses can offer limited-time deals", urgency: "high" },

  // DECEMBER
  { name: "Detty December", month: 12, day: 1, is_floating: false, applicable_to: ["warm-sensory", "luxury-aspirational", "community-vibrant", "editorial-bold"], content_angle: "Lagos end-of-year season — events, celebrations, going out, looking good", urgency: "high" },
  { name: "Christmas Day", month: 12, day: 25, is_floating: false, applicable_to: "all", content_angle: "Celebration, family, gifts, gratitude — warmest post of the year", urgency: "high" },
  { name: "New Year's Eve", month: 12, day: 31, is_floating: false, applicable_to: "all", content_angle: "Year in review, gratitude to customers, looking ahead to next year", urgency: "high" },
];

// Ramadan (floating Islamic month — inject separately, varies each year)
// For 2025: Ramadan is March 1 – March 30
// For 2026: Ramadan is February 18 – March 19
// Inject as: { name: "Ramadan", applicable_to: "all", content_angle: "Iftar specials, generous spirit, community. Very high engagement for businesses." urgency: "high" }

export function getNigerianCulturalMoments(month: number, year: number): CulturalMoment[] {
  return NIGERIAN_CULTURAL_CALENDAR.filter(m => m.month === month);
  // Note: floating dates (Easter, Sallah, Ramadan) require a separate lookup
  // for the exact year — implement this lookup using a pre-computed table for 2025–2027
}
```

---

## 5. TRENDING TOPICS ENGINE

Uses Gemini with web search to find what is relevant right now in the user's industry and location. Results are cached for 24 hours to avoid redundant API calls.

```typescript
// src/lib/content/trending-topics.ts

export interface TrendingTopic {
  topic: string;
  angle: string;         // Specific content angle for this business type
  relevance: "high" | "medium";
  source: "web_search" | "cached" | "fallback";
}

export async function getTrendingTopics(
  industry: string,
  location: string
): Promise<TrendingTopic[]> {

  // Check cache first (Supabase table with 24h TTL)
  const cached = await getCachedTrends(industry);
  if (cached) return cached;

  try {
    const topics = await fetchTrendingWithGemini(industry, location);
    await cacheTrends(industry, topics);
    return topics;
  } catch (err) {
    console.error("Trending topics fetch failed:", err);
    return getFallbackTopics(industry); // Static fallbacks — always works
  }
}

async function fetchTrendingWithGemini(
  industry: string,
  location: string
): Promise<TrendingTopic[]> {
  // Use Gemini with web search tool
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY!,
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Search the web for what is trending right now in ${industry} in Nigeria (${location}).
                 Find 5 specific trending topics, news items, conversations, or moments that a
                 ${industry} business in Nigeria should be talking about on social media this week.
                 
                 For each topic, provide:
                 - topic: the trend or moment (specific, not generic)
                 - angle: how a ${industry} business should address this topic on social media (1 sentence)
                 - relevance: "high" or "medium"
                 
                 Output ONLY valid JSON: { "topics": [ { "topic": "...", "angle": "...", "relevance": "high" } ] }
                 No markdown, no explanation.`
        }]
      }],
      tools: [{ googleSearch: {} }],
    }),
  });

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts
    ?.filter((p: any) => p.text)
    .map((p: any) => p.text)
    .join("") ?? "";

  const cleaned = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  return (parsed.topics ?? []).map((t: any) => ({ ...t, source: "web_search" as const }));
}

// Static fallbacks — used when web search fails
function getFallbackTopics(industry: string): TrendingTopic[] {
  const FALLBACKS: Record<string, TrendingTopic[]> = {
    default: [
      { topic: "Supporting local Nigerian businesses", angle: "Why buying local matters and how your business contributes to the Nigerian economy", relevance: "high", source: "fallback" },
      { topic: "Entrepreneurship in Nigeria", angle: "Share your own journey building a business in Nigeria — authentic stories resonate deeply", relevance: "medium", source: "fallback" },
      { topic: "Quality over quantity mindset", angle: "Speak to the premium value your business delivers vs. cheaper alternatives", relevance: "medium", source: "fallback" },
    ],
    "Food & Beverage": [
      { topic: "Healthy eating in Nigeria", angle: "How your food business caters to health-conscious Nigerians", relevance: "high", source: "fallback" },
      { topic: "Naija comfort food", angle: "Celebrate the emotional connection Nigerians have with traditional flavours", relevance: "high", source: "fallback" },
    ],
    "Beauty & Personal Care": [
      { topic: "Natural hair movement Nigeria", angle: "Position your salon or beauty brand within the natural/protective style conversation", relevance: "high", source: "fallback" },
      { topic: "Skin care for melanin-rich skin", angle: "Education content about products and routines for Nigerian skin tones", relevance: "high", source: "fallback" },
    ],
  };

  return FALLBACKS[industry] ?? FALLBACKS["default"];
}

// Supabase-based 24h cache
async function getCachedTrends(industry: string): Promise<TrendingTopic[] | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("trending_topics_cache")
    .select("topics, cached_at")
    .eq("industry", industry)
    .single();

  if (!data) return null;

  const ageHours = (Date.now() - new Date(data.cached_at).getTime()) / 3600000;
  if (ageHours > 24) return null;

  return data.topics as TrendingTopic[];
}

async function cacheTrends(industry: string, topics: TrendingTopic[]): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("trending_topics_cache").upsert({
    industry,
    topics,
    cached_at: new Date().toISOString(),
  }, { onConflict: "industry" });
}
```

---

## 6. OPTIMAL POSTING TIMES

Pre-computed Nigerian social media optimal times. These are the defaults for all users. Growth and Premium users get personalised times once Meta API data becomes available (see Section 9).

```typescript
// src/lib/content/posting-times.ts

// All times in WAT (West Africa Time, UTC+1)
export const OPTIMAL_POSTING_TIMES: Record<string, PostingTimeConfig> = {
  instagram: {
    best_days: ["Tuesday", "Wednesday", "Thursday", "Friday"],
    best_times: ["07:30", "12:00", "19:00", "21:00"],
    avoid_days: ["Sunday"],
    avoid_times_before: "06:00",
    avoid_times_after: "23:00",
    notes: "Evening (7–9pm WAT) is peak engagement for Nigerian Instagram users",
  },
  facebook: {
    best_days: ["Monday", "Wednesday", "Thursday", "Friday", "Saturday"],
    best_times: ["08:00", "12:30", "19:30"],
    avoid_days: [],
    avoid_times_before: "07:00",
    avoid_times_after: "22:00",
    notes: "Facebook sees strong daytime engagement from Nigerian professionals during lunch hours",
  },
  linkedin: {
    best_days: ["Tuesday", "Wednesday", "Thursday"],
    best_times: ["08:00", "12:00", "17:30"],
    avoid_days: ["Saturday", "Sunday"],
    avoid_times_before: "07:00",
    avoid_times_after: "19:00",
    notes: "LinkedIn performs best mid-week during business hours in Nigeria",
  },
  x: {
    best_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    best_times: ["07:00", "12:00", "17:00", "20:00"],
    avoid_days: [],
    avoid_times_before: "06:00",
    avoid_times_after: "23:00",
    notes: "Nigerian Twitter/X users are most active in the mornings and evenings",
  },
  tiktok: {
    best_days: ["Tuesday", "Thursday", "Friday", "Saturday"],
    best_times: ["19:00", "21:00", "22:00"],
    avoid_days: ["Monday"],
    avoid_times_before: "12:00",
    avoid_times_after: "23:30",
    notes: "TikTok peaks late evening for Nigerian users — 7pm to midnight WAT",
  },
};

export function getSuggestedTime(platform: string, date: Date): string {
  const config = OPTIMAL_POSTING_TIMES[platform];
  if (!config) return "12:00";
  // Pick a time from best_times array, cycling through them
  const index = date.getDate() % config.best_times.length;
  return config.best_times[index];
}
```

---

## 7. REPURPOSE ENGINE

Takes one approved calendar slot and adapts the core message for all other active platforms. Saves significant creation time.

```typescript
// src/lib/content/repurpose-engine.ts

export async function repurposeSlot(
  supabase: SupabaseClient,
  userId: string,
  sourceSlotId: string,
  targetPlatforms: string[]
): Promise<CalendarSlot[]> {

  const { data: sourceSlot } = await supabase
    .from("content_calendar")
    .select("*, content_pillars(name, description)")
    .eq("id", sourceSlotId)
    .eq("user_id", userId)
    .single();

  if (!sourceSlot) throw new Error("Source slot not found");

  const { data: brand } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  const prompt = `
You are adapting a social media post idea for multiple platforms.

BUSINESS: ${brand?.business_name} — ${brand?.industry}
ORIGINAL PLATFORM: ${sourceSlot.platform}
ORIGINAL TOPIC: ${sourceSlot.topic}
ORIGINAL HOOK: ${sourceSlot.hook}
ORIGINAL BRIEF: ${sourceSlot.brief}
CONTENT PILLAR: ${(sourceSlot as any).content_pillars?.name}

Adapt this content idea for each of the following platforms.
Keep the CORE MESSAGE identical but adjust the format, tone, and hook for each platform's audience behaviour.

TARGET PLATFORMS: ${targetPlatforms.join(", ")}

Platform-specific adaptation rules:
- instagram: visual-first, punchy hook, emotion-driven, max 150 words caption
- facebook: conversational, can be longer (up to 250 words), storytelling works well
- linkedin: professional angle, thought leadership lens, insights-focused, 100-200 words
- x: ultra-short (max 60 words), punchy opinion or question, thread-friendly
- tiktok: script hook for short video (coming_soon: true), max 3 sentences

Output ONLY valid JSON:
{
  "adaptations": [
    {
      "platform": "instagram",
      "topic": "adapted topic",
      "hook": "adapted hook for this platform",
      "brief": "adapted brief for this platform",
      "format_type": "static_image",
      "coming_soon": false
    }
  ]
}
`;

  const { adaptations } = await geminiJSON<{ adaptations: any[] }>(prompt, "flash");

  // Create new calendar slots for each adaptation
  const newSlots = adaptations.map(adaptation => ({
    user_id: userId,
    pillar_id: sourceSlot.pillar_id,
    platform: adaptation.platform,
    scheduled_date: sourceSlot.scheduled_date,   // same date as source (user can move it)
    scheduled_time: getSuggestedTime(adaptation.platform, new Date(sourceSlot.scheduled_date)),
    format_type: adaptation.format_type,
    topic: adaptation.topic,
    hook: adaptation.hook,
    brief: adaptation.brief,
    status: "draft" as const,
    coming_soon: adaptation.coming_soon ?? false,
    repurposed_from: sourceSlotId,
  }));

  const { data: inserted } = await supabase
    .from("content_calendar")
    .insert(newSlots)
    .select();

  return inserted ?? [];
}
```

---

## 8. CONTENT SERIES GENERATOR

Creates a planned multi-part series of related posts for sustained engagement over several days or a week.

```typescript
// src/lib/content/series-generator.ts

export interface SeriesDefinition {
  name: string;
  description: string;
  post_count: number;
  duration_days: number;
  best_for: DesignArchetype[];
}

// Pre-defined series templates (AI fills in the business-specific content)
export const SERIES_TEMPLATES: SeriesDefinition[] = [
  {
    name: "Meet the Team",
    description: "One team member per day, 5 days",
    post_count: 5,
    duration_days: 5,
    best_for: ["authority-minimal", "trust-professional", "clean-modern"],
  },
  {
    name: "How We Make It",
    description: "Behind-the-scenes process in 4 parts",
    post_count: 4,
    duration_days: 7,
    best_for: ["warm-sensory", "portfolio-dramatic", "editorial-bold"],
  },
  {
    name: "Customer of the Week",
    description: "Feature a customer story across 3 posts",
    post_count: 3,
    duration_days: 7,
    best_for: ["community-vibrant", "luxury-aspirational", "warm-sensory"],
  },
  {
    name: "5 Tips Series",
    description: "One actionable tip per day for 5 days",
    post_count: 5,
    duration_days: 5,
    best_for: ["authority-minimal", "trust-professional", "clean-modern", "community-vibrant"],
  },
  {
    name: "Before & After",
    description: "2-post transformation reveal",
    post_count: 2,
    duration_days: 3,
    best_for: ["luxury-aspirational", "community-vibrant", "warm-sensory"],
  },
  {
    name: "Product Deep Dive",
    description: "3-part breakdown of your signature product or service",
    post_count: 3,
    duration_days: 5,
    best_for: ["clean-modern", "editorial-bold", "authority-minimal"],
  },
];

export async function generateSeries(
  brand: BusinessProfile,
  seriesTemplate: SeriesDefinition,
  platform: string,
  startDate: Date
): Promise<CalendarSlot[]> {
  const prompt = `
Create a ${seriesTemplate.post_count}-part content series called "${seriesTemplate.name}" 
for ${brand.business_name} (${brand.industry}).

Series description: ${seriesTemplate.description}
Platform: ${platform}
Start date: ${startDate.toISOString().split("T")[0]}
Business services: ${brand.services.join(", ")}
Brand tone: ${brand.brand_tone}

Generate exactly ${seriesTemplate.post_count} posts that form a cohesive series.
Each post must reference the series (so the audience knows it is part of a set).
Each post must build on or complement the previous one.

Output ONLY valid JSON:
{
  "series_title": "series name customised for this business",
  "posts": [
    {
      "part_number": 1,
      "topic": "specific topic for this post",
      "hook": "opening hook that mentions Part 1 of the series",
      "brief": "what this post should say",
      "format_type": "static_image"
    }
  ]
}
`;

  const { series_title, posts } = await geminiJSON<{ series_title: string; posts: any[] }>(prompt, "flash");

  return posts.map((post, i) => {
    const postDate = new Date(startDate);
    postDate.setDate(startDate.getDate() + Math.floor((i / seriesTemplate.post_count) * seriesTemplate.duration_days));

    return {
      platform,
      topic: `[Series: ${series_title}] Part ${post.part_number}: ${post.topic}`,
      hook: post.hook,
      brief: post.brief,
      format_type: post.format_type,
      scheduled_date: postDate.toISOString().split("T")[0],
      scheduled_time: getSuggestedTime(platform, postDate),
      status: "draft" as const,
      is_series: true,
      series_title,
      series_part: post.part_number,
      series_total: seriesTemplate.post_count,
    };
  });
}
```

---

## 9. PERFORMANCE FEEDBACK LOOP (Growth + Premium)

For users with Meta Business API connected. Past post performance informs future calendar generation.

```typescript
// src/lib/content/performance-analyzer.ts

export async function analyzePerformanceAndUpdateStrategy(
  supabase: SupabaseClient,
  userId: string
): Promise<PerformanceInsights> {

  // Fetch last 30 days of performance data from meta_insights table
  const { data: insights } = await supabase
    .from("meta_insights")
    .select("*")
    .eq("user_id", userId)
    .gte("post_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order("engagement_rate", { ascending: false });

  if (!insights?.length) return { status: "insufficient_data" };

  // Find top-performing patterns
  const topPillars = aggregateByField(insights, "pillar_name").slice(0, 2);
  const topFormats = aggregateByField(insights, "format_type").slice(0, 2);
  const topDays = aggregateByField(insights, "day_of_week").slice(0, 3);
  const topTimes = aggregateByField(insights, "hour_posted").slice(0, 2);

  const performanceInsights: PerformanceInsights = {
    status: "ok",
    top_performing_pillars: topPillars,
    top_performing_formats: topFormats,
    best_days: topDays,
    best_times: topTimes,
    recommendation: buildRecommendation(topPillars, topFormats, topDays),
  };

  // Store for use in next calendar generation
  await supabase.from("content_strategy_insights").upsert({
    user_id: userId,
    insights: performanceInsights,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  return performanceInsights;
}

// When generating next month's calendar for Growth/Premium users,
// inject performance insights into the prompt:
function injectPerformanceInsights(
  prompt: string,
  insights: PerformanceInsights
): string {
  if (insights.status !== "ok") return prompt;

  return prompt + `

PERFORMANCE DATA FROM LAST 30 DAYS (use this to optimise the calendar):
- Best performing content pillars: ${insights.top_performing_pillars.join(", ")}
- Best performing formats: ${insights.top_performing_formats.join(", ")}
- Best posting days: ${insights.best_days.join(", ")}
- IMPORTANT: Weight the calendar toward the top-performing pillars and formats above.
  Do not eliminate others entirely — maintain variety — but give top performers 40% of slots.
`;
}
```

---

## 10. CALENDAR SEEDING (runs once after onboarding)

```typescript
// src/app/api/content/seed-calendar/route.ts
// Called internally after onboarding completes — fire and forget

export async function POST(req: Request) {
  // Verify internal call
  const internalSecret = req.headers.get("x-internal-secret");
  if (internalSecret !== process.env.INTERNAL_API_SECRET) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await req.json();
  const supabase = createServiceClient();

  // Fetch brand and subscription
  const [{ data: brand }, { data: sub }] = await Promise.all([
    supabase.from("business_profiles").select("*").eq("user_id", userId).single(),
    supabase.from("subscriptions").select("plan_id").eq("user_id", userId).single(),
  ]);

  if (!brand) return NextResponse.json({ error: "No brand profile" }, { status: 404 });

  const planId = sub?.plan_id ?? "free";
  const planLimits = PLAN_CONFIG[planId]?.limits;

  // Free plan: do not seed calendar — they have no calendar access
  if (planId === "free") return NextResponse.json({ skipped: true, reason: "free_plan" });

  // Seed pillars
  const archetype = resolveArchetype(brand.business_type, brand.industry, brand.services, brand.brand_vibe);
  await seedContentPillars(supabase, userId, archetype);

  // Fetch seeded pillars
  const { data: pillars } = await supabase
    .from("content_pillars")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  // Determine platform access
  const allPlatforms = brand.platforms ?? ["instagram", "facebook"];
  const platformLimit = planLimits.social_platforms;
  const activePlatforms = platformLimit === null ? allPlatforms : allPlatforms.slice(0, platformLimit);

  // Generate first month's calendar
  const now = new Date();
  const slots = await generateMonthlyCalendar({
    userId,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    brand,
    pillars: pillars ?? [],
    platforms: activePlatforms,
    postsPerMonth: planLimits.calendar_posts_per_month,
  });

  // Save slots to DB
  if (slots.length > 0) {
    await supabase.from("content_calendar").insert(
      slots.map(slot => ({ ...slot, user_id: userId }))
    );
  }

  // Increment usage
  await supabase.rpc("increment_usage", {
    p_user_id: userId,
    p_metric: "content_calendar_posts",
    p_amount: slots.length,
  });

  return NextResponse.json({ success: true, slots_created: slots.length });
}
```

---

## 11. ALL API ROUTES

| Method | Route | Description | Auth | Plan Gate |
|---|---|---|---|---|
| POST | /api/content/seed-calendar | Seed first month (called from onboarding) | Internal | Pro+ |
| GET | /api/content/calendar | Get calendar slots for date range | Yes | Pro+ |
| POST | /api/content/calendar/generate-month | Generate next month's calendar | Yes | Pro+ |
| GET | /api/content/calendar/[id] | Get single slot detail | Yes | Pro+ |
| PATCH | /api/content/calendar/[id] | Edit a slot (topic, date, platform, brief) | Yes | Pro+ |
| DELETE | /api/content/calendar/[id] | Delete a slot | Yes | Pro+ |
| POST | /api/content/calendar/[id]/approve | Mark slot as approved | Yes | Pro+ |
| POST | /api/content/calendar/[id]/regenerate | Regenerate a slot's topic/hook/brief | Yes | Pro+ |
| POST | /api/content/calendar/[id]/repurpose | Repurpose to other platforms | Yes | Growth+ |
| POST | /api/content/series | Generate a content series | Yes | Growth+ |
| GET | /api/content/pillars | Get user's content pillars | Yes | Pro+ |
| POST | /api/content/pillars | Add a new pillar | Yes | Pro+ |
| PATCH | /api/content/pillars/[id] | Edit a pillar | Yes | Pro+ |
| DELETE | /api/content/pillars/[id] | Delete a pillar | Yes | Pro+ |
| GET | /api/content/trending | Get trending topics for user's industry | Yes | Growth+ |
| GET | /api/content/cultural-calendar | Get upcoming Nigerian cultural moments | Yes | Pro+ |
| GET | /api/content/insights | Get performance insights | Yes | Growth+ |
| POST | /api/content/seed-calendar | Calendar seed (internal trigger) | Internal | Pro+ |

---

## 12. DATABASE SCHEMA

```sql
-- ============================================================
-- CONTENT PILLARS
-- ============================================================
CREATE TABLE IF NOT EXISTS content_pillars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  color text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE content_pillars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own pillars" ON content_pillars FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_content_pillars_user_id ON content_pillars(user_id);

-- ============================================================
-- CONTENT CALENDAR
-- ============================================================
CREATE TABLE IF NOT EXISTS content_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pillar_id uuid REFERENCES content_pillars(id) ON DELETE SET NULL,
  platform text NOT NULL,
  -- platform: instagram | facebook | linkedin | x | tiktok
  scheduled_date date NOT NULL,
  scheduled_time time,
  format_type text NOT NULL,
  -- format_type: static_image | carousel | reel | story | text_post | article | thread | poll | short_video
  topic text NOT NULL,
  hook text,
  brief text,
  status text NOT NULL DEFAULT 'draft',
  -- status: draft | approved | generated | posted | skipped
  content_id uuid,  -- References generated_content.id when content is created
  is_cultural_moment boolean DEFAULT false,
  cultural_moment_name text,
  coming_soon boolean DEFAULT false,  -- true for video formats
  is_series boolean DEFAULT false,
  series_title text,
  series_part integer,
  series_total integer,
  repurposed_from uuid REFERENCES content_calendar(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own calendar" ON content_calendar FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_content_calendar_user_date ON content_calendar(user_id, scheduled_date);
CREATE INDEX idx_content_calendar_status ON content_calendar(user_id, status);
CREATE INDEX idx_content_calendar_platform ON content_calendar(user_id, platform);

-- ============================================================
-- TRENDING TOPICS CACHE
-- ============================================================
CREATE TABLE IF NOT EXISTS trending_topics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry text UNIQUE NOT NULL,
  topics jsonb NOT NULL,
  cached_at timestamptz DEFAULT now()
);

-- ============================================================
-- CONTENT STRATEGY INSIGHTS (Performance feedback loop)
-- ============================================================
CREATE TABLE IF NOT EXISTS content_strategy_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  insights jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE content_strategy_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own insights" ON content_strategy_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages insights" ON content_strategy_insights FOR ALL USING (auth.role() = 'service_role');
```

---

## 13. INPUT VALIDATION — CONTENT STRATEGY

| Field | Rules |
|---|---|
| Pillar name | Min 2 chars, max 50 chars. Letters, numbers, spaces, ampersands only. No HTML. Cannot be only numbers or only special chars. |
| Pillar description | Max 120 chars. Sanitized text. |
| Calendar slot topic | Min 5 chars, max 200 chars. Sanitized. No HTML. Cannot be only emojis. |
| Calendar slot hook | Max 150 chars. |
| Calendar slot brief | Max 500 chars. |
| Scheduled date | Must be a valid date. Must be today or in the future (cannot schedule in the past). Max 12 months in future. |
| Platform | Must be one of: instagram, facebook, linkedin, x, tiktok. |
| Format type | Must be a valid format for the given platform (see PLATFORM_FORMATS map). |
| Custom series name | Min 3 chars, max 60 chars. |
| Trending topics query | Sanitized before passing to Gemini. Max 100 chars. |

---

## 14. ERROR HANDLING — COMPLETE MAP

| Scenario | System Action | User-Facing Message |
|---|---|---|
| Calendar generation Gemini call fails | Retry once, then use template calendar (static pre-written slots) | "Your calendar is ready with starter ideas. You can regenerate at any time." |
| Calendar generation JSON parse fails | Retry with stricter prompt (same as website builder pattern) | Silent retry |
| Trending topics web search fails | Serve cached topics if available; else serve static fallbacks | No error shown — fallback topics appear seamlessly |
| Trending topics cache miss AND fallback serves | Serve static fallbacks | No error shown |
| Cultural calendar lookup for unknown month | Return empty array | No cultural moments shown — calendar still generates |
| Repurpose engine Gemini call fails | Return only the source slot unchanged, skip adaptation | "Could not repurpose to all platforms. Please try again." |
| Series generation fails | Return error | "Series generation failed. Please try again." |
| User tries to delete pillar with active slots | Block delete, return 409 | "X upcoming posts use this pillar. Remove those posts first, or choose a different pillar for them." |
| User tries to create a 7th pillar | Return 403 | "You can have a maximum of 6 content pillars." |
| Slot date is in the past | Return 400 | "Please choose a future date." |
| Slot date is more than 12 months away | Return 400 | "You can only schedule up to 12 months ahead." |
| Calendar posts limit reached (Pro: 12, Growth: 30) | Return 403 on any new slot creation | "You've used all [X] calendar posts for this month. Upgrade for more, or wait until [date]." |
| User on Free plan tries to access calendar | Return 403 | "Content calendar is available from the Pro plan. [Upgrade]" |
| User on Pro plan tries to repurpose | Return 403 | "Repurposing across platforms is available from the Growth plan. [Upgrade]" |
| Platform not in user's active platforms | Return 400 | "That platform is not in your active platforms. Update your platform settings first." |
| Gemini generates a slot with placeholder text | Detect [brackets] pattern in topic/hook/brief → mark slot as needs_review = true | Slot shows a "Needs review" tag in the UI |
| Performance insights: Meta API not connected | Return empty insights with status: "not_connected" | "Connect your Meta Business account in Settings to get personalised insights." |
| Slot regeneration limit hit | Count regenerations against website_regenerations limit (shared) | "Regeneration limit reached for this month." |

---

## 15. PLAN-GATED FEATURES

| Feature | Free | Pro | Growth | Premium |
|---|---|---|---|---|
| Content calendar | No | Yes | Yes | Yes |
| Max calendar posts/month | 0 | 12 | 30 | Unlimited (30 per generation) |
| Active platforms | 0 | 2 | 4 | All |
| Content pillars | No | Yes (default only, no custom) | Yes (custom pillars) | Yes (custom pillars) |
| Cultural calendar injection | No | Yes | Yes | Yes |
| Trending topics | No | No | Yes | Yes |
| Repurpose engine | No | No | Yes | Yes |
| Content series generator | No | No | Yes | Yes |
| Performance feedback loop | No | No | Yes | Yes |
| Posting time intelligence | No | Basic (generic times) | Yes (Nigerian-optimised) | Yes + personalised |
| AI performance report | No | No | No | Monthly auto-generated |

---

## 16. CALENDAR UI REQUIREMENTS

The calendar UI lives at `/dashboard/content`.

Layout options the user can toggle:
- **Month view** — grid of the current month with slot cards on each date (default)
- **List view** — chronological list of all upcoming slots

Slot card shows:
- Platform icon
- Format type label
- Pillar color dot
- Topic (truncated to 1 line)
- Status badge (Draft / Approved / Generated / Coming Soon)
- [Generate] button if status is approved (triggers Content Generation system)
- [Edit] [Repurpose] [Delete] icon buttons

Filters (top of page):
- Platform filter (chip selector)
- Pillar filter (chip selector)
- Status filter (chip selector)
- Month navigation (prev / next)

Empty state (no slots for the month):
- Show: "No posts scheduled for [Month]. Generate your content calendar."
- CTA: "Generate [Month] Calendar" button → triggers /api/content/calendar/generate-month

Cultural moment badges:
- Calendar dates that match a cultural moment show a small gold diamond icon
- Hovering / tapping shows the moment name and why it matters

---

## 17. IMPLEMENTATION ORDER

1. `src/lib/content/cultural-calendar.ts` — static data, no dependencies
2. `src/lib/content/posting-times.ts` — static data, no dependencies
3. `src/lib/content/pillars.ts` — static pillar definitions
4. Database migration (schema above)
5. `src/lib/content/trending-topics.ts` — depends on Gemini + Supabase cache
6. `src/lib/content/calendar-generator.ts` — depends on 1, 2, 3, 5
7. `src/lib/content/repurpose-engine.ts` — depends on Gemini
8. `src/lib/content/series-generator.ts` — depends on Gemini
9. `src/lib/content/performance-analyzer.ts` — depends on Meta API (see ANALYTICS.md)
10. `src/app/api/content/seed-calendar/route.ts`
11. `src/app/api/content/calendar/` — all CRUD routes
12. `src/app/api/content/pillars/` — all CRUD routes
13. `src/app/api/content/trending/route.ts`
14. `src/app/api/content/series/route.ts`
15. Dashboard content page — month view calendar UI
16. Pillar management UI (settings-style panel)
17. Series generation modal
18. Repurpose modal (multi-platform preview)