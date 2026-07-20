# ZURI — CONTENT STRATEGY ADDENDUM (03B)
# Layers on top of 03_CONTENT_STRATEGY.md. Read that file first — this document
# only specifies what changes or gets added. Nothing here replaces anything
# in 03 unless explicitly marked "REPLACES".

Covers: cultural calendar correction, visible trend evidence on calendar slots,
the universal content rating system, and the campaign preview dashboard.

---

## 1. CULTURAL CALENDAR — CORRECTION (REPLACES §4 entry)

`NIGERIAN_CULTURAL_CALENDAR` in `03_CONTENT_STRATEGY.md` §4 contains a
"Detty December" entry. Replace it with a Christmas-season entry. Islamic
holidays (Eid al-Adha/Sallah, Ramadan) stay exactly as specified — Zuri
serves businesses whose customers span faiths, and those moments are
genuinely high-engagement for Nigerian audiences regardless of the
business owner's own faith.

```typescript
// src/lib/content/cultural-calendar.ts — replace the December "Detty December" entry with:

{
  name: "Christmas Season",
  month: 12,
  day: 1,
  is_floating: false,
  applicable_to: ["warm-sensory", "luxury-aspirational", "community-vibrant", "editorial-bold"],
  content_angle: "Lagos end-of-year season — family gatherings, gifting, celebration, gratitude for the year. Frame around togetherness and thankfulness rather than nightlife.",
  urgency: "high",
},
```

No other calendar entries change. `Christmas Day` (Dec 25) and `New Year's
Eve` (Dec 31) remain as already specified in 03 §4.

---

## 2. VISIBLE TREND EVIDENCE ON CALENDAR SLOTS

### 2.1 Problem this solves

`getTrendingTopics()` (03 §5) already runs a real Gemini + Google Search
call, but its output is consumed silently inside the calendar-generation
prompt — nothing in the UI proves the search happened. For a competition
judge, this is wasted evidence of a genuine Gemini capability. Fix: tie
each influenced slot back to the specific trend that shaped it, and surface
it as a visible badge.

### 2.2 Schema addition

```sql
-- Addition to content_calendar (03 §12)
ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS trend_source jsonb;
-- Shape when present: { "topic": string, "angle": string, "fetched_at": timestamptz string }
-- Null when the slot was not trend-influenced (most slots — trends should
-- inform a minority of posts, not dominate the calendar).
```

### 2.3 Generation change

In `buildCalendarPrompt()` (03 §3.5), instruct Gemini to explicitly flag
which slots used a trend, and which trend:

```typescript
// Addition to the RULES block in buildCalendarPrompt():
`9. If a slot's topic is directly inspired by one of the TRENDING TOPICS listed above,
   set "trend_topic" to that trend's exact topic text. Otherwise set it to null.
   Do not force trends into slots where they don't fit naturally — most slots
   should have trend_topic: null.`
```

```typescript
// Addition to the output JSON schema in buildCalendarPrompt():
{
  "slots": [
    {
      // ...existing fields from 03 §3.5...
      "trend_topic": "string matching a trend topic above, or null"
    }
  ]
}
```

`mergeCalendarOutput()` (referenced in 03 §3.1, implementation was left
unspecified in 03 — specify it now) must attach `trend_source` by matching
`trend_topic` against the `trends` array passed into `generateMonthlyCalendar`:

```typescript
function mergeCalendarOutput(
  generatedSlots: GeneratedSlot[],
  pillarRotation: string[],
  scheduledDates: Date[],
  formatsDistribution: Record<string, PostFormat>,
  culturalMoments: CulturalMoment[],
  trends: TrendingTopic[],
  userId: string
): CalendarSlot[] {
  return generatedSlots.map((slot, i) => {
    const matchedTrend = slot.trend_topic
      ? trends.find(t => t.topic === slot.trend_topic)
      : null;

    return {
      user_id: userId,
      pillar_id: pillarRotation[i] ?? null,
      platform: slot.platform,
      format_type: slot.format_type,
      topic: slot.topic,
      hook: slot.hook,
      brief: slot.brief,
      scheduled_date: scheduledDates[i]?.toISOString().split("T")[0],
      scheduled_time: getSuggestedTime(slot.platform, scheduledDates[i]),
      status: "draft" as const,
      coming_soon: slot.coming_soon ?? false,
      is_cultural_moment: slot.is_cultural_moment ?? false,
      cultural_moment_name: slot.cultural_moment_name ?? null,
      trend_source: matchedTrend
        ? { topic: matchedTrend.topic, angle: matchedTrend.angle, fetched_at: new Date().toISOString() }
        : null,
    };
  });
}
```

### 2.4 UI requirement

On the calendar slot card (03 §16), a trend-sourced slot shows a small
badge — gold outline pill, icon `TrendingUp` (Lucide) — reading "Trending"
next to the cultural-moment diamond icon (they're mutually exclusive in
practice; a slot is rarely both). Tapping/hovering the badge shows a
tooltip: the trend topic and its angle, so the user can see exactly what
Gemini found and why it shaped this post. This is the single most
judge-visible piece of evidence that live web search is doing real work —
don't bury it in a settings panel.

Filter bar (03 §16) gains one more chip: **"Trending"** — filters to slots
where `trend_source IS NOT NULL`.

---

## 3. CONTENT RATING SYSTEM (available to all plans, Pro+)

### 3.1 Purpose

Every piece of `generated_content` (04 §11) can be rated 1-5 by the user.
This is intentionally simple for v1: no auto-adjustment of future
generation based on ratings yet — that's future scope. What v1 delivers:

1. A quality signal captured at scale from real users (useful both as a
   competition metric — "average content quality: 4.2/5 across N ratings"
   — and as the seed data for a future adaptive loop).
2. The trigger mechanism for evolving brand voice (see 04B §2) — a 4 or 5
   rating marks that content's caption as a candidate "voice example."
3. Simple analytics: "your best-performing pillar this month" surfaced
   from ratings alone, no Meta API required — this becomes a Free-tier-
   friendly substitute for the Growth+-only performance feedback loop in
   03 §9, so even non-Meta-connected users get *some* sense of what's
   working.

### 3.2 Schema

```sql
CREATE TABLE IF NOT EXISTS content_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  generated_content_id uuid REFERENCES generated_content(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (generated_content_id)  -- one rating per content item, re-rating overwrites
);

ALTER TABLE content_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_ratings FORCE ROW LEVEL SECURITY;
CREATE POLICY "ratings_all_own" ON content_ratings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_content_ratings_user ON content_ratings(user_id);
CREATE INDEX idx_content_ratings_content ON content_ratings(generated_content_id);
```

This is a genuinely separate table from `content_strategy_insights` (03
§12), which remains Meta-API-driven and Growth+-only. `content_ratings` is
the everyone-tier, in-app-only signal. They are not merged in v1.

### 3.3 API

```typescript
// src/app/api/content/[id]/rate/route.ts
// POST — body: { rating: number (1-5) }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { rating } = await req.json();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be an integer from 1 to 5." }, { status: 400 });
  }

  const supabase = await createClient();

  // Confirm ownership
  const { data: content } = await supabase
    .from("generated_content")
    .select("id, caption, platform")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();
  if (!content) return NextResponse.json({ error: "Content not found." }, { status: 404 });

  const { data: saved, error: upsertError } = await supabase
    .from("content_ratings")
    .upsert({ user_id: user.id, generated_content_id: content.id, rating, updated_at: new Date().toISOString() },
      { onConflict: "generated_content_id" })
    .select()
    .single();
  if (upsertError) return NextResponse.json({ error: "Could not save rating." }, { status: 500 });

  // 4-5 star ratings with a caption feed the evolving voice bank (see 04B §2.2)
  if (rating >= 4 && content.caption) {
    await captureVoiceExample(supabase, user.id, content.caption, "rated");
  }

  return NextResponse.json({ success: true, rating: saved.rating });
}
```

```typescript
// src/app/api/content/ratings-summary/route.ts
// GET — simple aggregate for the dashboard: average rating overall, by pillar, by platform
export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const supabase = await createClient();

  const { data } = await supabase
    .from("content_ratings")
    .select("rating, generated_content(platform, calendar_slot_id, content_calendar(pillar_id, content_pillars(name)))")
    .eq("user_id", user.id);

  // Aggregate in application code — dataset is small per user, no need for a DB view
  return NextResponse.json({ ratings: data ?? [] });
}
```

### 3.4 UI requirement

On the Generated Content View (04 §16), add a 5-star rating control
(gold-fill stars matching the accent color, matching the pill/card visual
language already in the dashboard) directly beneath the caption/image, with
label "Rate this content" shown once and "Rated ★★★★☆ — tap to change"
after rating. Rating is optional — never block "Mark as Posted" on it, but
prompt lightly: after marking a slot as posted, show a one-time inline
nudge ("How did this one turn out?") rather than a modal.

Ratings summary surfaces on the Content dashboard home as a small card:
"Average content rating: 4.2 ★ (18 rated)" with a one-line callout on the
top-performing pillar if the sample is large enough (≥5 ratings) — e.g.
"Behind the Scenes posts are your highest-rated pillar." Below 5 ratings,
don't show a top-pillar claim — show "Rate a few more posts to see what's
working" instead. Don't fabricate confidence from noise.

### 3.5 API routes table addition

| Method | Route | Description | Auth | Plan Gate |
|---|---|---|---|---|
| POST | /api/content/[id]/rate | Rate a generated content item 1-5 | Yes | Pro+ |
| GET | /api/content/ratings-summary | Aggregate ratings for dashboard | Yes | Pro+ |

---

## 4. CAMPAIGN PREVIEW (device-frame dashboard feature)

### 4.1 What it is

A dedicated preview surface — not a one-off modal — reachable via a
"Preview Campaign" button from three entry points: the month-view calendar
(preview the whole month or a filtered subset), a completed series
(04/03 §8), or a repurpose result (03 §7). Renders each selected post
inside a lightweight platform-accurate device frame (phone-width card
styled to loosely resemble IG/FB/LinkedIn/X post chrome — avatar circle
placeholder, handle, the actual generated caption + image, platform icon)
so the user sees approximately how the batch will look once posted, side
by side.

This is the single highest-leverage "premium feel" addition in this round:
it turns a grid of database rows into something that looks like a finished
marketing deliverable, and it's realistically a UI layer over data that
already fully exists (`generated_content` rows) — no new AI calls required.

### 4.2 Route and data shape

```
/dashboard/content/preview?slots=id1,id2,id3
```

Fetches the corresponding `generated_content` rows (only ones with
status = "ready" or "partial" — ungenerated slots are excluded with a
note: "N posts in this selection haven't been generated yet").

```typescript
// src/app/api/content/preview-batch/route.ts
// GET ?ids=uuid,uuid,uuid
export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 30); // hard cap
  if (ids.length === 0) return NextResponse.json({ error: "No content selected." }, { status: 400 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("generated_content")
    .select("id, platform, format_type, caption, hashtags, image_url, status, calendar_slot_id, content_calendar(topic, scheduled_date)")
    .eq("user_id", user.id)
    .in("id", ids);

  return NextResponse.json({ items: data ?? [] });
}
```

### 4.3 UI requirements

- Layout: horizontally scrollable row of device-frame cards on desktop
  (grid wrap on narrower viewports), grouped/sortable by platform or by
  scheduled date — user toggles grouping.
- Each frame: platform-accurate aspect ratio for the image (reuse
  `getAspectRatio()` from 04 §3.1 so the frame's image area isn't
  generically square), caption below with hashtags visibly separated,
  small scheduled-date label in the frame header.
- Frame chrome uses generic placeholder identity (grey avatar circle,
  "Your Business" label) — never fabricate follower counts, likes, or
  engagement numbers. This is a content preview, not a fake-metrics mockup;
  fabricated social proof would undermine trust and could look deceptive
  in a judge demo.
- Rating stars (§3.4) are present inline on each frame — this is the
  natural place for a user to rate a whole campaign's output in one pass.
- Top bar actions: "Export All Captions" (bundles clipboard-friendly text),
  "Back to Calendar."
- Empty/partial state: if some selected slots aren't generated yet, show
  them as a dimmed placeholder frame with "Not generated yet" and a
  [Generate] shortcut button, rather than silently omitting them — the
  user should see the full shape of their campaign even where content is
  missing.

### 4.4 Entry points to wire up

1. Calendar month view (03 §16): multi-select checkbox mode on slot cards
   → "Preview Selected (N)" button appears once ≥1 is selected.
2. Series generation result (03 §8): after `generateSeries()` completes and
   slots are generated, offer "Preview This Series" directly.
3. Repurpose result (03 §7): after `repurposeSlot()` completes, offer
   "Preview Repurposed Set."

---

## 5. UPDATED IMPLEMENTATION ORDER (appends to 03 §17)

18. Cultural calendar correction (§1) — trivial data edit
19. `trend_source` column migration + `mergeCalendarOutput()` implementation (§2)
20. Trend badge + filter chip in calendar UI (§2.4)
21. `content_ratings` table migration (§3.2)
22. `src/app/api/content/[id]/rate/route.ts` + `ratings-summary/route.ts` (§3.3)
23. Rating stars UI in Generated Content View + dashboard summary card (§3.4)
24. `src/app/api/content/preview-batch/route.ts` (§4.2)
25. `/dashboard/content/preview` page + device-frame card component (§4.3)
26. Wire preview entry points into calendar, series, and repurpose UI (§4.4)
