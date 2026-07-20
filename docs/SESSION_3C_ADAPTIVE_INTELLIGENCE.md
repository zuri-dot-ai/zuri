SESSION 3C — ADAPTIVE INTELLIGENCE (Voice Memory, Ratings, Trend Evidence, Campaign Preview)
Model: claude-sonnet-4-5
When: After Sessions 3A and 3B are confirmed working (this session builds on
top of content_calendar and generated_content, both of which must already exist and function).
Prereqs: Sessions 3A + 3B complete and tested end-to-end (calendar generates,
content generation pipeline produces real captions/images).
Read @docs/03_CONTENT_STRATEGY.md, @docs/03B_CONTENT_STRATEGY_ADDENDUM.md,
@docs/04_CONTENT_GENERATION.md, and @docs/04B_CONTENT_GENERATION_ADDENDUM.md
in full before writing any code. The addendum docs are the authoritative
spec for everything in this session — the base docs are context only.

Task: Build four features on top of the working content system: (1) corrected
+ trend-evidenced cultural calendar, (2) the universal 1-5 content rating
system, (3) evolving brand voice memory, (4) the campaign preview dashboard.
These are the features that make Zuri's content system feel adaptive and
premium rather than a one-shot generator — this is core competition-demo
material, so quality and visual polish matter more in this session than raw
feature count.

---

PART 1 — CULTURAL CALENDAR CORRECTION + TREND EVIDENCE
(spec: 03B §1, §2)

1. src/lib/content/cultural-calendar.ts — replace the "Detty December" entry
   per 03B §1 exactly. Do not alter any other entries, including the Islamic
   holiday entries (Eid al-Adha, Ramadan) — those stay as-is.
2. Database migration: add `trend_source jsonb` column to `content_calendar`
   per 03B §2.2.
3. src/lib/content/calendar-generator.ts — update buildCalendarPrompt() to
   add the trend_topic instruction and output field per 03B §2.3. Implement
   mergeCalendarOutput() in full per the code in 03B §2.3 (this function was
   referenced but not implemented in the original 03A session — implement it
   now exactly as specified, including the trend-matching logic).
4. Calendar UI (src/app/(app)/content/page.tsx, built in 3A): add the
   "Trending" badge (gold outline pill, Lucide TrendingUp icon) to slot
   cards where trend_source is not null, with hover/tap tooltip showing the
   trend topic + angle. Add "Trending" as a filter chip alongside the
   existing platform/pillar/status filters.

Success criteria: A generated monthly calendar has at least some slots with
trend_source populated (verify by checking the trends returned from
getTrendingTopics() actually appear referenced in at least 1-2 slots out of
a typical 12-30 slot month — not forced into every slot). The trend badge
renders correctly and the tooltip shows real trend data, not placeholder text.

---

PART 2 — CONTENT RATING SYSTEM
(spec: 03B §3)

5. Database migration: content_ratings table, exactly as specified in 03B §3.2,
   including the RLS policy and the UNIQUE constraint on generated_content_id.
6. src/app/api/content/[id]/rate/route.ts — POST endpoint per 03B §3.3.
   Must call captureVoiceExample() (built in Part 3 below — sequence Part 3's
   voice-bank.ts file before wiring this call, since this route depends on it)
   when rating >= 4 and content.caption exists.
7. src/app/api/content/ratings-summary/route.ts — GET endpoint per 03B §3.3.
8. Generated Content View component (built in 3B, likely
   src/components/content/GeneratedContentView.tsx or similar — locate the
   existing component from Session 3B rather than creating a duplicate): add
   the 5-star rating control per 03B §3.4. Use gold fill matching the app's
   existing accent color (#C9A84C, confirmed from current dashboard — match
   the pill-badge and card visual language already in use, do not introduce
   a new visual style for this control).
9. Content dashboard home: add the ratings summary card per 03B §3.4 —
   average rating + rated count, with the top-pillar callout gated on >=5
   ratings, and the "rate a few more" fallback message below that threshold.

Success criteria: Rating a piece of content persists correctly, re-rating
the same content overwrites (does not duplicate) the row, and the summary
card reflects real aggregated data. A rating of 4 or 5 on content with a
caption visibly adds an entry to brand_voice_examples (verify in Part 3).

---

PART 3 — EVOLVING BRAND VOICE MEMORY
(spec: 04B in full)

10. Database migration: brand_voice_examples table per 04B §2.1.
11. src/lib/content/voice-bank.ts — captureVoiceExample(), isSubstantiveEdit(),
    getVoiceContext(), exactly per 04B §2.2 and §2.4, including the 10-example
    cap enforcement and the 2-example minimum before injection activates.
12. src/app/api/content/[id]/edit-caption/route.ts — per 04B §2.3. If Session
    3B already built a caption-edit save path under a different route name,
    consolidate into this one rather than creating two competing endpoints —
    check the existing codebase for a caption PATCH/edit route before creating
    a new file.
13. Wire captureVoiceExample() into the rating endpoint from Part 2, step 6.
14. Update src/lib/content/caption-generator.ts — generateCaption() must call
    getVoiceContext() once per invocation and thread the result into whichever
    builder function it calls (buildStandardCaptionPrompt, buildThreadPrompt,
    buildPollPrompt, buildLinkedInArticlePrompt), inserted per 04B §2.4's
    placement instruction (after brand tone line, before platform rules).
15. Update src/lib/content/blog-generator.ts and
    src/lib/content/newsletter-generator.ts similarly — inject voice context
    after the "Brand tone" line in each prompt.
16. src/app/api/settings/voice-examples/route.ts — GET + DELETE per 04B §2.5.
17. Settings page (src/app/(app)/settings/page.tsx, built in Session 5B —
    if that session hasn't run yet, create a minimal "Brand Voice" section
    as a standalone addition that Session 5B can later fold into the full
    settings page): read-only list of current voice examples with source tag
    and delete button, per 04B §2.5.

Success criteria: Editing a caption substantively before saving creates a
brand_voice_examples row with source="edited". A caption generated after 2+
voice examples exist visibly differs in prompt behavior (spot-check: log the
final prompt sent to Gemini in dev and confirm the EXAMPLES OF THIS
BUSINESS'S ACTUAL VOICE block is present and populated). Deleting all
examples from Settings causes generation to fall back to current
brand_tone-only behavior without errors.

---

PART 4 — CAMPAIGN PREVIEW DASHBOARD
(spec: 03B §4)

18. src/app/api/content/preview-batch/route.ts — GET endpoint per 03B §4.2,
    including the 30-item cap and ownership check.
19. src/app/dashboard/content/preview/page.tsx — the preview page itself.
    Build a device-frame card component (new: src/components/content/
    DeviceFrameCard.tsx) styled to match the app's existing dark-mode card
    language (see current dashboard screenshots — rounded corners, subtle
    border, consistent padding with other cards in the app) with:
    - Platform-accurate image aspect ratio (reuse getAspectRatio() from
      src/lib/content/image-dimensions.ts, built in 3B)
    - Generic placeholder avatar + "Your Business" label — NEVER fabricate
      follower counts, like counts, or engagement numbers on these frames
    - Caption + hashtags rendered below the image, visually separated
    - Scheduled date label in the frame header
    - Inline 5-star rating control (reuse the component from Part 2, step 8)
    - Dimmed "Not generated yet" placeholder frame + [Generate] shortcut for
      any selected slot lacking generated_content
20. Grouping toggle (by platform / by date) and "Export All Captions" +
    "Back to Calendar" actions in the page header.
21. Wire the three entry points per 03B §4.4:
    a. Calendar month view: add multi-select checkbox mode to slot cards,
       "Preview Selected (N)" button appears once >=1 slot is checked.
    b. Series generation result screen (built in 3A): add "Preview This
       Series" button after generation completes.
    c. Repurpose result screen (built in 3A): add "Preview Repurposed Set"
       button after repurposing completes.

Success criteria: Selecting 3-5 posts from the calendar and clicking Preview
renders a clean, platform-accurate, side-by-side view that looks like a
finished deliverable — this is the screen to screenshot for the competition
demo video. No fabricated metrics anywhere in the frames. Rating from within
the preview screen persists identically to rating from the single-item view.

---

GENERAL RULES FOR THIS SESSION

- Every new API route follows the existing auth pattern: requireAuth() first,
  matching src/lib/auth/require-auth.ts from the security system.
- Every new table needs RLS enabled + forced, matching the pattern in
  10_SECURITY.md §3 (auth.uid() = user_id for user-owned tables).
- Do not modify the visual design system, fonts, or color tokens — reuse
  what's already established in the dashboard (gold #C9A84C accent, dark
  background, Cormorant Garamond headings, Montserrat body, pill-style
  badges for status).
- Run `npx tsc --noEmit` before ending the session. Zero type errors.
- Test at 375px viewport — the preview page in particular needs to degrade
  to a stacked single-column layout on mobile, not a broken horizontal
  scroll.

Success criteria (full session): A user can generate a month's calendar,
see which posts were trend-influenced, generate content for a handful of
slots, rate them, see their caption edits or high ratings feed into future
generation quality, and preview a selected batch as a polished side-by-side
campaign view — all without leaving the existing dashboard's visual language.
TypeScript: zero errors. This session's output (specifically Part 4) should
be demo-video-ready.
