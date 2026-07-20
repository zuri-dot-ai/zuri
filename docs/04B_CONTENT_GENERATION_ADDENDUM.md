# ZURI — CONTENT GENERATION ADDENDUM (04B)
# Layers on top of 04_CONTENT_GENERATION.md. Read that file first. Also
# depends on 03B_CONTENT_STRATEGY_ADDENDUM.md §3 (content_ratings table) —
# read that section before implementing §2 below, since the rating trigger
# lives there.

Covers: evolving brand voice memory — capturing, storing, capping, and
injecting real examples of the business's actual voice into every
generation call, so output gets more consistent and more "them" the more
the product is used.

---

## 1. WHY THIS EXISTS

Every caption, blog, and newsletter in 04 is generated from a single
descriptor string (`brand.brand_tone`, e.g. "warm and professional"). That's
too thin to prevent voice drift across dozens of generations — post #3 and
post #40 have no reason to sound like the same person wrote them. This
addendum gives Gemini real examples of "how this business actually sounds"
and grows that example set automatically as the user interacts with the
product, without adding any onboarding burden now (full onboarding voice
capture is explicitly deferred — see conversation history).

---

## 2. VOICE EXAMPLE BANK

### 2.1 Schema

```sql
CREATE TABLE IF NOT EXISTS brand_voice_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  source text NOT NULL,        -- "edited" | "rated" | "manual"
  platform text,                -- platform the example came from, if applicable
  created_at timestamptz DEFAULT now()
);

ALTER TABLE brand_voice_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_voice_examples FORCE ROW LEVEL SECURITY;
CREATE POLICY "voice_examples_all_own" ON brand_voice_examples FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_voice_examples_user ON brand_voice_examples(user_id, created_at DESC);
```

Cap: **10 most recent examples per user**, enforced at write time (§2.3),
not read time — keeps the table small and keeps prompt injection (§3)
simple, no need to query-then-limit on every generation call.

### 2.2 Capture triggers (both, as specified)

**Trigger A — edited before approval.** Whenever a user edits a generated
caption via the existing content-edit flow (04 §16, "editable text area")
and the edit is substantive (see below), the *edited* version — not the
original AI draft — is captured as a voice example with `source: "edited"`.
This is the strongest signal: the user rewrote it to sound like them.

**Trigger B — rated 4 or 5.** Called from `03B §3.3`'s rating endpoint.
When a piece of content with a caption is rated 4 or 5, that caption
(whichever version is current — edited or original) is captured with
`source: "rated"`. This is a weaker but still useful signal: the user
liked it enough that it's worth learning from, even unedited.

```typescript
// src/lib/content/voice-bank.ts

const MIN_SUBSTANTIVE_EDIT_CHARS = 15; // ignore trivial edits (typo fixes, single word swaps)
const MAX_VOICE_EXAMPLES = 10;

export async function captureVoiceExample(
  supabase: SupabaseClient,
  userId: string,
  text: string,
  source: "edited" | "rated" | "manual",
  platform?: string
): Promise<void> {
  const clean = sanitizeText(text);
  if (clean.length < 20) return; // too short to be a useful voice sample

  await supabase.from("brand_voice_examples").insert({
    user_id: userId,
    text: clean,
    source,
    platform: platform ?? null,
  });

  // Enforce the cap — delete oldest beyond the 10 most recent
  const { data: all } = await supabase
    .from("brand_voice_examples")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (all && all.length > MAX_VOICE_EXAMPLES) {
    const toDelete = all.slice(MAX_VOICE_EXAMPLES).map(r => r.id);
    await supabase.from("brand_voice_examples").delete().in("id", toDelete);
  }
}

// Called from the caption edit-save path (04 §16 / editor PATCH endpoint)
export function isSubstantiveEdit(original: string, edited: string): boolean {
  if (original === edited) return false;
  const diff = Math.abs(original.length - edited.length);
  // Cheap heuristic: either meaningful length delta, or edited retains <70%
  // of original words in the same order (crude but avoids an extra Gemini call)
  const originalWords = new Set(original.toLowerCase().split(/\s+/));
  const editedWords = edited.toLowerCase().split(/\s+/);
  const retained = editedWords.filter(w => originalWords.has(w)).length;
  const retentionRatio = editedWords.length ? retained / editedWords.length : 1;
  return diff >= MIN_SUBSTANTIVE_EDIT_CHARS || retentionRatio < 0.7;
}
```

### 2.3 Wiring into existing endpoints

**Content edit path** — the caption edit UI referenced in 04 §16 needs a
save endpoint if one doesn't already exist; specify it here:

```typescript
// src/app/api/content/[id]/edit-caption/route.ts
// PATCH — body: { caption: string }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const { caption } = await req.json();
  const clean = sanitizeText(caption);
  if (clean.length < 3) return NextResponse.json({ error: "Caption is too short." }, { status: 400 });

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("generated_content")
    .select("id, caption, platform")
    .eq("id", params.id).eq("user_id", user.id).single();
  if (!existing) return NextResponse.json({ error: "Content not found." }, { status: 404 });

  if (existing.caption && isSubstantiveEdit(existing.caption, clean)) {
    await captureVoiceExample(supabase, user.id, clean, "edited", existing.platform);
  }

  await supabase.from("generated_content").update({ caption: clean, updated_at: new Date().toISOString() }).eq("id", params.id);
  return NextResponse.json({ success: true });
}
```

**Rating path** — already wired in 03B §3.3 (`captureVoiceExample(supabase, user.id, content.caption, "rated")` on rating ≥ 4).

### 2.4 Injecting voice examples into generation prompts

Add a shared helper, called before every prompt-building function in 04
that produces caption/blog/newsletter copy:

```typescript
// src/lib/content/voice-bank.ts (continued)

export async function getVoiceContext(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from("brand_voice_examples")
    .select("text")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(MAX_VOICE_EXAMPLES);

  if (!data || data.length < 2) return ""; // need at least 2 examples before it's worth injecting

  return `
EXAMPLES OF THIS BUSINESS'S ACTUAL VOICE (match this tone, phrasing style, and energy —
these are real approved posts from this business, not generic examples):
${data.map((d, i) => `${i + 1}. "${d.text}"`).join("\n")}
`;
}
```

Inject the result into every relevant prompt builder in 04:

- `buildStandardCaptionPrompt()` (04 §4.2) — append `voiceContext` after the
  BRAND TONE line, before PLATFORM RULES.
- `buildThreadPrompt()`, `buildPollPrompt()`, `buildLinkedInArticlePrompt()` (04 §4.2) — same placement.
- `generateBlogPost()` (04 §5.2) — append after "Brand tone" line.
- `generateNewsletter()` (04 §6.2) — append after "Brand tone" line.

`generateCaption()` (04 §4.2) becomes responsible for fetching
`voiceContext` once via `getVoiceContext()` and threading it into whichever
builder function it calls — do this once per call, not once per builder, to
avoid a redundant DB round trip.

Below 2 stored examples, `getVoiceContext()` returns an empty string and
every prompt behaves exactly as it does today in 04 — this is additive and
fails open, never blocks generation.

### 2.5 Settings UI addition (minimal, for transparency)

Add a small read-only section to `/dashboard/settings` (already listed in
`00_MASTER_PROMPT.md` §16 Session 5B): "Brand Voice" — shows the current
voice examples (most recent first) with their source tag ("From an edit
you made" / "From a post you rated highly") and a delete (✕) button per
example, so users can prune anything that doesn't feel representative. No
manual "add example" input in this round — that's `source: "manual"`,
reserved for the future onboarding-capture work already deferred.

```typescript
// src/app/api/settings/voice-examples/route.ts
// GET — list current examples
// DELETE ?id=uuid — remove one example (still respects RLS: auth.uid() = user_id)
```

---

## 3. ERROR HANDLING ADDITIONS (appends to 04 §14)

| Scenario | System Action | User-Facing Message |
|---|---|---|
| Voice example capture fails (insert error) | Log, do not block the edit/rating save | No error shown — capture is best-effort |
| Voice bank has 0-1 examples | `getVoiceContext()` returns empty string, generation proceeds unchanged | No message — invisible |
| User deletes all voice examples from Settings | Same as above — system gracefully returns to brand_tone-only prompts | No message |
| Substantive-edit heuristic misfires (captures a trivial edit) | No user-facing consequence — worst case is one weak example that ages out at the 10-cap | Not surfaced |

---

## 4. UPDATED IMPLEMENTATION ORDER (appends to 04 §17)

20. `brand_voice_examples` table migration (§2.1)
21. `src/lib/content/voice-bank.ts` — `captureVoiceExample`, `isSubstantiveEdit`, `getVoiceContext` (§2.2, §2.4)
22. `src/app/api/content/[id]/edit-caption/route.ts` (§2.3)
23. Wire `captureVoiceExample` call into 03B's rating endpoint (§2.3, cross-file dependency — implement 03B §3 first)
24. Inject `getVoiceContext()` into `generateCaption()`, `generateBlogPost()`, `generateNewsletter()` prompt builders (§2.4)
25. `src/app/api/settings/voice-examples/route.ts` + Settings UI section (§2.5)
