"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Diamond,
  Pencil,
  RefreshCw,
  Share2,
  Trash2,
  Check,
  Sparkles,
  TrendingUp,
  X,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Banner, type BannerVariant } from "@/components/ui/Banner";
import { EmptyState } from "@/components/app/empty-state";
import { RatingsSummaryCard } from "@/components/content/RatingsSummaryCard";
import { GeneratedContentView } from "@/components/content/GeneratedContentView";
import { cn } from "@/lib/utils";
import { safeFetchJSON, FetchError } from "@/lib/utils/safe-fetch";
import { getNigerianCulturalMoments } from "@/lib/content/cultural-calendar";
import {
  PLATFORM_SHORT_LABELS,
  PLATFORM_META,
  formatMeta,
} from "@/lib/content/format-meta";
import { RATE_LIMIT_MESSAGE } from "@/lib/errors/gemini-errors";
import { statusStyle, statusColors, pillarStripeStyle } from "@/styles/tokens";
import type {
  ContentCalendarRow,
  ContentPillarRow,
  ContentStatus,
} from "@/types/database";
import type { PlanId } from "@/lib/payments/plans";

const SERIES_OPTIONS = [
  { name: "Meet the Team", post_count: 5 },
  { name: "How We Make It", post_count: 4 },
  { name: "Customer of the Week", post_count: 3 },
  { name: "5 Tips Series", post_count: 5 },
  { name: "Before & After", post_count: 2 },
  { name: "Product Deep Dive", post_count: 3 },
] as const;

type SlotWithPillar = ContentCalendarRow & {
  content_pillars?: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  } | null;
};

type Notice = { variant: BannerVariant; message: string };

/** True when a caught error is a Gemini quota/rate-limit failure surfaced
 * by the API as HTTP 429 — this must show the friendly Banner message,
 * never the raw diagnostic text some other failures carry. */
function isRateLimited(e: unknown): boolean {
  return e instanceof FetchError && e.status === 429;
}

const DAYS_PER_PAGE = 7;

function monthBounds(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end, lastDay };
}

function formatMonthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleString("en-NG", {
    month: "long",
    year: "numeric",
  });
}

export function ContentCalendar({
  initialSlots,
  pillars,
  plan,
  initialMonth,
  initialYear,
}: {
  initialSlots: SlotWithPillar[];
  pillars: ContentPillarRow[];
  plan: PlanId;
  initialMonth: number;
  initialYear: number;
}) {
  const [slots, setSlots] = useState<SlotWithPillar[]>(initialSlots);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [visibleDayCount, setVisibleDayCount] = useState(DAYS_PER_PAGE);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [pillarFilter, setPillarFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [trendingOnly, setTrendingOnly] = useState(false);
  const [active, setActive] = useState<SlotWithPillar | null>(null);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);
  // Per-action pending state so a slow AI action (regenerate/repurpose)
  // doesn't disable the fast, optimistic ones (approve/delete) and vice
  // versa — approve/delete no longer share the single `busy` flag above.
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [regenerating, setRegenerating] = useState(false);
  const [repurposing, setRepurposing] = useState(false);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editTopic, setEditTopic] = useState("");
  const [editHook, setEditHook] = useState("");
  const [editBrief, setEditBrief] = useState("");
  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contentRefreshKey, setContentRefreshKey] = useState(0);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [seriesTemplate, setSeriesTemplate] = useState<string>(
    SERIES_OPTIONS[0]?.name ?? "Meet the Team"
  );
  const [seriesPlatform, setSeriesPlatform] = useState("instagram");
  const [lastSeriesIds, setLastSeriesIds] = useState<string[]>([]);
  const [lastRepurposeIds, setLastRepurposeIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);

  const growth = plan === "growth" || plan === "premium";
  const monthName = formatMonthLabel(year, month);

  const culturalMoments = useMemo(
    () => getNigerianCulturalMoments(month, year),
    [month, year]
  );

  const culturalByDay = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of culturalMoments) {
      if (m.day) map.set(m.day, m.name);
      else if (m.date && m.date !== "variable") {
        const d = new Date(m.date);
        if (d.getMonth() + 1 === month && d.getFullYear() === year) {
          map.set(d.getDate(), m.name);
        }
      }
    }
    return map;
  }, [culturalMoments, month, year]);

  const filtered = useMemo(() => {
    return slots.filter((s) => {
      if (platformFilter !== "all" && s.platform !== platformFilter) return false;
      if (pillarFilter !== "all" && s.pillar_id !== pillarFilter) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "coming_soon") {
          if (!s.coming_soon) return false;
        } else if (s.status !== statusFilter) return false;
      }
      if (trendingOnly && !s.trend_source) return false;
      return true;
    });
  }, [slots, platformFilter, pillarFilter, statusFilter, trendingOnly]);

  function toggleSelect(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Chronological, day-grouped list — only days that actually have
  // scheduled content are rendered, no empty grid cells.
  const dayGroups = useMemo(() => {
    const map = new Map<string, SlotWithPillar[]>();
    for (const s of filtered) {
      const key = s.scheduled_date;
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, daySlots]) => ({
        date,
        slots: daySlots.sort((a, b) =>
          (a.scheduled_time ?? "").localeCompare(b.scheduled_time ?? "")
        ),
      }));
  }, [filtered]);

  const visibleDayGroups = dayGroups.slice(0, visibleDayCount);
  const hasMoreDays = dayGroups.length > visibleDayCount;

  // Collapse back to the first week whenever the filters or the loaded
  // month change, so switching filters doesn't leave the reader scrolled
  // deep into a list that just changed shape.
  useEffect(() => {
    setVisibleDayCount(DAYS_PER_PAGE);
  }, [platformFilter, pillarFilter, statusFilter, trendingOnly, month, year]);

  async function loadMonth(nextMonth: number, nextYear: number) {
    setBusy(true);
    try {
      const { start, end } = monthBounds(nextYear, nextMonth);
      const data = await safeFetchJSON<{ slots: SlotWithPillar[] }>(
        `/api/content/calendar?from=${start}&to=${end}`
      );
      setSlots(data.slots ?? []);
      setMonth(nextMonth);
      setYear(nextYear);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load calendar");
    } finally {
      setBusy(false);
    }
  }

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    void loadMonth(m, y);
  }

  async function generateMonth() {
    setGenerating(true);
    try {
      const data = await safeFetchJSON<{
        slots: SlotWithPillar[];
        slots_created: number;
        message?: string;
        usedFallback?: boolean;
        reason?: string;
      }>("/api/content/calendar/generate-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      if (data.slots?.length) {
        setSlots((prev) => {
          const ids = new Set(prev.map((s) => s.id));
          return [...prev, ...data.slots.filter((s) => !ids.has(s.id))];
        });
      }

      if (data.usedFallback) {
        // Never let this look like a normal success — the slots that just
        // landed are hardcoded starter content, not real AI output.
        setNotice({
          variant: "warning",
          message:
            data.reason ??
            "We couldn't reach the AI right now, so starter content was created instead.",
        });
        toast.error("AI generation unavailable — starter content created instead");
      } else {
        setNotice(null);
        toast.success(
          data.slots_created
            ? `Added ${data.slots_created} posts to ${monthName}`
            : data.message ?? "Calendar ready"
        );
      }
    } catch (e) {
      if (isRateLimited(e)) {
        setNotice({ variant: "error", message: RATE_LIMIT_MESSAGE });
      } else {
        toast.error(e instanceof Error ? e.message : "Could not generate calendar");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function approveSlot(slot: SlotWithPillar) {
    // Optimistic: this is a plain DB status flip, so paint the approved
    // state immediately and only roll back if the request actually fails.
    const previous = slot;
    const optimistic: SlotWithPillar = { ...slot, status: "approved" };
    setApprovingIds((prev) => new Set(prev).add(slot.id));
    setSlots((prev) => prev.map((s) => (s.id === slot.id ? optimistic : s)));
    setActive((cur) => (cur?.id === slot.id ? optimistic : cur));
    try {
      const data = await safeFetchJSON<{ slot: SlotWithPillar }>(
        `/api/content/calendar/${slot.id}/approve`,
        { method: "POST" }
      );
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? data.slot : s)));
      setActive((cur) => (cur?.id === slot.id ? data.slot : cur));
      toast.success("Slot approved");
    } catch (e) {
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? previous : s)));
      setActive((cur) => (cur?.id === slot.id ? previous : cur));
      toast.error(e instanceof Error ? e.message : "Could not approve");
    } finally {
      setApprovingIds((prev) => {
        const next = new Set(prev);
        next.delete(slot.id);
        return next;
      });
    }
  }

  async function regenerateSlot(slot: SlotWithPillar) {
    setRegenerating(true);
    try {
      const data = await safeFetchJSON<{ slot: SlotWithPillar }>(
        `/api/content/calendar/${slot.id}/regenerate`,
        { method: "POST" }
      );
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? data.slot : s)));
      setActive(data.slot);
      toast.success("Brief regenerated");
    } catch (e) {
      // A 429 (Gemini quota/rate-limit) always shows the friendly Banner
      // message — the API never forwards the raw Gemini error body to the
      // client (see calendar/[id]/regenerate/route.ts), so this can't leak
      // a raw JSON dump. Other failures keep the existing toast.
      if (isRateLimited(e)) {
        setNotice({ variant: "error", message: RATE_LIMIT_MESSAGE });
      } else {
        toast.error(e instanceof Error ? e.message : "Could not regenerate");
      }
    } finally {
      setRegenerating(false);
    }
  }

  async function deleteSlot(slot: SlotWithPillar) {
    if (!confirm("Delete this calendar slot?")) return;
    // Optimistic: remove immediately and close the drawer; if the delete
    // actually fails on the server, restore the slot and reopen it rather
    // than leaving the user staring at a spinner for a DB-only op.
    const previous = slot;
    const previousIndex = slots.findIndex((s) => s.id === slot.id);
    setDeletingIds((prev) => new Set(prev).add(slot.id));
    setSlots((prev) => prev.filter((s) => s.id !== slot.id));
    setActive(null);
    try {
      await safeFetchJSON(`/api/content/calendar/${slot.id}`, {
        method: "DELETE",
      });
      toast.success("Slot deleted");
    } catch (e) {
      setSlots((prev) => {
        const next = [...prev];
        const insertAt = Math.min(Math.max(previousIndex, 0), next.length);
        next.splice(insertAt, 0, previous);
        return next;
      });
      setActive(previous);
      toast.error(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(slot.id);
        return next;
      });
    }
  }

  async function repurposeSlot(slot: SlotWithPillar) {
    if (!growth) {
      toast.error("Repurposing is available on Growth and Premium.");
      return;
    }
    const targets = ["instagram", "facebook", "linkedin", "x", "tiktok"].filter(
      (p) => p !== slot.platform
    );
    setRepurposing(true);
    try {
      const data = await safeFetchJSON<{ slots: SlotWithPillar[] }>(
        `/api/content/calendar/${slot.id}/repurpose`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platforms: targets.slice(0, 3) }),
        }
      );
      if (data.slots?.length) {
        setSlots((prev) => [...prev, ...data.slots]);
        setLastRepurposeIds(data.slots.map((s) => s.id));
      }
      toast.success(`Created ${data.slots?.length ?? 0} adapted slots`);
    } catch (e) {
      if (isRateLimited(e)) {
        setNotice({ variant: "error", message: RATE_LIMIT_MESSAGE });
      } else {
        toast.error(e instanceof Error ? e.message : "Could not repurpose");
      }
    } finally {
      setRepurposing(false);
    }
  }

  async function createSeries() {
    if (!growth) {
      toast.error("Series generator is available on Growth and Premium.");
      return;
    }
    setBusy(true);
    try {
      const data = await safeFetchJSON<{ slots: SlotWithPillar[] }>(
        "/api/content/series",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template: seriesTemplate,
            platform: seriesPlatform,
            startDate: new Date().toISOString().slice(0, 10),
          }),
        }
      );
      if (data.slots?.length) {
        setSlots((prev) => [...prev, ...data.slots]);
        setLastSeriesIds(data.slots.map((s) => s.id));
      }
      setSeriesOpen(false);
      toast.success(`Series created: ${data.slots?.length ?? 0} posts`);
    } catch (e) {
      if (isRateLimited(e)) {
        setNotice({ variant: "error", message: RATE_LIMIT_MESSAGE });
      } else {
        toast.error(e instanceof Error ? e.message : "Could not create series");
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(slot: SlotWithPillar) {
    setSavingEdit(true);
    try {
      const data = await safeFetchJSON<{ slot: SlotWithPillar }>(
        `/api/content/calendar/${slot.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: editTopic,
            hook: editHook,
            brief: editBrief,
          }),
        }
      );
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? data.slot : s)));
      setActive(data.slot);
      setEditing(false);
      toast.success("Slot updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSavingEdit(false);
    }
  }

  async function generateContent(slot: SlotWithPillar) {
    setGeneratingContent(true);
    try {
      const output = await safeFetchJSON<{
        id: string;
        status?: "ready" | "partial";
        warnings?: string[];
      }>("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: slot.platform,
          formatType: slot.format_type,
          topic: slot.topic,
          hook: slot.hook ?? "",
          brief: slot.brief ?? "",
          calendarSlotId: slot.id,
        }),
      });
      const updated = {
        ...slot,
        status: "generated" as ContentStatus,
        content_id: output.id,
      };
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? updated : s)));
      if (active?.id === slot.id) {
        setActive(updated);
      }
      setContentRefreshKey((k) => k + 1);

      // These warnings (image safety fallback, script partially generated,
      // caption needs review, etc.) were previously collected server-side
      // but never surfaced — a "partial" result looked identical to a full
      // success. Show each one explicitly instead of a blanket "success".
      if (output.warnings && output.warnings.length > 0) {
        output.warnings.forEach((w) => toast.warning(w));
      } else {
        toast.success("Content generated");
      }
    } catch (e) {
      if (isRateLimited(e)) {
        setNotice({ variant: "error", message: RATE_LIMIT_MESSAGE });
      } else {
        toast.error(e instanceof Error ? e.message : "Could not generate content");
      }
    } finally {
      setGeneratingContent(false);
    }
  }

  function openSlot(slot: SlotWithPillar) {
    setActive(slot);
    setEditing(false);
    setEditTopic(slot.topic);
    setEditHook(slot.hook ?? "");
    setEditBrief(slot.brief ?? "");
  }

  if (plan === "free") {
    return (
      <div className="mx-auto max-w-5xl">
        <header className="page-head">
          <h1>Content</h1>
        </header>
        <EmptyState
          variant="content"
          title="Content calendar starts on Pro"
          description="Upgrade to get an AI-planned posting calendar tailored to your business."
          actionLabel="View plans"
          actionHref="/billing"
        />
      </div>
    );
  }

  const platformsInUse = Array.from(new Set(slots.map((s) => s.platform)));

  return (
    <div className="mx-auto max-w-6xl">
      <header className="page-head flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Content</h1>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            Your AI content calendar for {monthName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => shiftMonth(-1)}
            disabled={busy}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center text-sm font-medium">
            {monthName}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => shiftMonth(1)}
            disabled={busy}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {notice && (
        <Banner
          variant={notice.variant}
          message={notice.message}
          actions={
            <>
              {notice.variant === "warning" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateMonth}
                  disabled={generating}
                >
                  {generating ? (
                    <span className="zuri-spinner mr-1 !size-3.5" />
                  ) : (
                    <RefreshCw className="mr-1 h-3.5 w-3.5" />
                  )}
                  Retry Generation
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setNotice(null)}
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          }
        />
      )}

      <RatingsSummaryCard />

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip
          active={platformFilter === "all"}
          onClick={() => setPlatformFilter("all")}
          label="All platforms"
        />
        {platformsInUse.map((p) => (
          <FilterChip
            key={p}
            active={platformFilter === p}
            onClick={() => setPlatformFilter(p)}
            label={PLATFORM_SHORT_LABELS[p] ?? p}
          />
        ))}
        <span className="mx-1 w-px self-stretch bg-[var(--border-solid)]" />
        <FilterChip
          active={pillarFilter === "all"}
          onClick={() => setPillarFilter("all")}
          label="All pillars"
        />
        {pillars
          .filter((p) => p.is_active)
          .map((p) => (
            <FilterChip
              key={p.id}
              active={pillarFilter === p.id}
              onClick={() => setPillarFilter(p.id)}
              label={p.name}
              dot={p.color ?? undefined}
            />
          ))}
        <span className="mx-1 w-px self-stretch bg-[var(--border-solid)]" />
        {(["all", "draft", "approved", "generated", "coming_soon"] as const).map(
          (s) => (
            <FilterChip
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              label={
                s === "all"
                  ? "All status"
                  : s === "coming_soon"
                    ? "Coming soon"
                    : statusColors[s]?.label ?? s
              }
            />
          )
        )}
        <span className="mx-1 w-px self-stretch bg-[var(--border-solid)]" />
        <FilterChip
          active={trendingOnly}
          onClick={() => setTrendingOnly((v) => !v)}
          label="Trending"
        />
      </div>

      {(selectedIds.size > 0 ||
        lastSeriesIds.length > 0 ||
        lastRepurposeIds.length > 0) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border-solid)] bg-[var(--bg-secondary)] px-3 py-2">
          {selectedIds.size > 0 && (
            <Button size="sm" asChild>
              <Link
                href={`/content/preview?slots=${Array.from(selectedIds).join(",")}`}
              >
                Preview Selected ({selectedIds.size})
              </Link>
            </Button>
          )}
          {lastSeriesIds.length > 0 && (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/content/preview?slots=${lastSeriesIds.join(",")}`}>
                Preview This Series
              </Link>
            </Button>
          )}
          {lastRepurposeIds.length > 0 && (
            <Button size="sm" variant="outline" asChild>
              <Link
                href={`/content/preview?slots=${lastRepurposeIds.join(",")}`}
              >
                Preview Repurposed Set
              </Link>
            </Button>
          )}
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear selection
            </Button>
          )}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="space-y-4">
          <EmptyState
            variant="content"
            title={`No posts scheduled for ${monthName.split(" ")[0]}. Generate your content calendar.`}
            description="Zuri will plan topics, hooks, and briefs across your platforms."
          />
          <div className="flex justify-center pb-8">
            <Button onClick={generateMonth} disabled={generating}>
              {generating ? (
                <>
                  <span className="zuri-spinner mr-2 !size-4" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate {monthName.split(" ")[0]} Calendar
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-5">
          {visibleDayGroups.map(({ date, slots: daySlots }) => {
            const dayNum = Number(date.slice(8, 10));
            const cultural = culturalByDay.get(dayNum);
            const dateLabel = new Date(date + "T00:00:00").toLocaleDateString(
              "en-NG",
              { weekday: "long", day: "numeric", month: "long" }
            );
            return (
              <div key={date}>
                <div className="mb-3 flex items-center gap-2 border-b border-[var(--border-solid)] pb-2">
                  <h3 className="text-section-header">{dateLabel}</h3>
                  {cultural && (
                    <span
                      title={cultural}
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-[#C9A84C]"
                    >
                      <Diamond className="h-3 w-3 fill-current" />
                      {cultural}
                    </span>
                  )}
                  <span className="ml-auto text-card-meta">
                    {daySlots.length} {daySlots.length === 1 ? "post" : "posts"}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {daySlots.map((slot) => (
                    <SlotCard
                      key={slot.id}
                      slot={slot}
                      selected={selectedIds.has(slot.id)}
                      open={active?.id === slot.id}
                      onToggleSelect={(e) => toggleSelect(slot.id, e)}
                      onClick={() => openSlot(slot)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {hasMoreDays && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  setVisibleDayCount((n) => n + DAYS_PER_PAGE)
                }
              >
                <ChevronDown className="mr-2 h-4 w-4" />
                Load more days
              </Button>
            </div>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {growth && (
            <Button
              variant="outline"
              onClick={() => setSeriesOpen(true)}
              disabled={busy}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Create series
            </Button>
          )}
          <Button
            variant="outline"
            onClick={generateMonth}
            disabled={generating}
          >
            {generating ? (
              <span className="zuri-spinner mr-2 !size-4" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Regenerate / add more
          </Button>
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div
            className="content-card flex h-full w-full max-w-md flex-col rounded-none border-y-0 border-r-0"
            style={pillarStripeStyle(active.content_pillars?.color)}
          >
            {/* Zone 1 — metadata: platform/format/date + close */}
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border-solid)] px-6 py-4">
              <div>
                <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                  {(() => {
                    const platformMeta = PLATFORM_META[active.platform];
                    if (!platformMeta) return null;
                    const PlatformIcon = platformMeta.Icon;
                    return (
                      <PlatformIcon
                        className="h-3.5 w-3.5"
                        style={{ color: platformMeta.color }}
                      />
                    );
                  })()}
                  {formatMeta(active.format_type).label} ·{" "}
                  {active.format_type.replace(/_/g, " ")}
                </p>
                <p className="text-card-title mt-1">
                  {new Date(active.scheduled_date).toLocaleDateString("en-NG", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                  {active.scheduled_time ? ` · ${active.scheduled_time.slice(0, 5)}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActive(null)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Zone 1b — status/pillar/tags, still part of the metadata
                zone but visually separated from the editable fields below */}
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-solid)] px-6 py-4">
              <span className={cn("inline-flex items-center gap-1", statusStyle(active).text)}>
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: statusStyle(active).dot }}
                />
                <span className="text-label">
                  {active.coming_soon ? statusColors.coming_soon.label : statusStyle(active).label}
                </span>
              </span>
              {active.content_pillars && (
                <span className="inline-flex items-center gap-2 text-card-meta">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{
                      background: active.content_pillars.color ?? "#C9A84C",
                    }}
                  />
                  {active.content_pillars.name}
                </span>
              )}
              {active.needs_review && (
                <Badge variant="outline">Needs review</Badge>
              )}
              {active.generation_source === "fallback" && (
                <Badge className="border-amber-500 text-amber-500" variant="outline">
                  Starter content — not AI generated
                </Badge>
              )}
              {active.is_cultural_moment && (
                <Badge variant="muted">
                  {active.cultural_moment_name ?? "Cultural moment"}
                </Badge>
              )}
            </div>

            {/* Zone 2 — editable content: Topic / Hook / Brief */}
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              {editing ? (
                <div className="space-y-4">
                  <label className="block text-label">
                    Topic
                    <input
                      className="mt-2 w-full rounded-md border border-[var(--border-solid)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors [transition-duration:var(--transition-fast)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                      value={editTopic}
                      onChange={(e) => setEditTopic(e.target.value)}
                    />
                  </label>
                  <label className="block text-label">
                    Hook
                    <input
                      className="mt-2 w-full rounded-md border border-[var(--border-solid)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors [transition-duration:var(--transition-fast)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                      value={editHook}
                      onChange={(e) => setEditHook(e.target.value)}
                    />
                  </label>
                  <label className="block text-label">
                    Brief
                    <textarea
                      className="mt-2 w-full rounded-md border border-[var(--border-solid)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors [transition-duration:var(--transition-fast)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                      rows={4}
                      value={editBrief}
                      onChange={(e) => setEditBrief(e.target.value)}
                    />
                  </label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveEdit(active)}
                      disabled={savingEdit}
                    >
                      {savingEdit && (
                        <span className="zuri-spinner mr-1 !size-3.5" />
                      )}
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(false)}
                      disabled={savingEdit}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-label">Topic</p>
                    <p className="text-card-title mt-1">{active.topic}</p>
                  </div>
                  {active.hook && (
                    <div>
                      <p className="text-label">Hook</p>
                      <p className="mt-1 text-sm italic text-[var(--text-secondary)]">
                        “{active.hook}”
                      </p>
                    </div>
                  )}
                  {active.brief && (
                    <div>
                      <p className="text-label">Brief</p>
                      <p className="text-card-body mt-1">{active.brief}</p>
                    </div>
                  )}
                  {active.trend_source && (
                    <div className="rounded-md border border-[#C9A84C]/40 bg-[#C9A84C]/5 px-3 py-3">
                      <p className="flex items-center gap-1 text-xs font-medium text-[#C9A84C]">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Trending
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-primary)]">
                        {active.trend_source.topic}
                      </p>
                      <p className="text-card-meta mt-1">{active.trend_source.angle}</p>
                    </div>
                  )}
                  {(active.status === "generated" || active.content_id) && (
                    <GeneratedContentView
                      key={`${active.id}-${contentRefreshKey}`}
                      contentId={active.content_id}
                      calendarSlotId={active.id}
                    />
                  )}
                </>
              )}
            </div>

            {/* Zone 3 — action bar: primary (gold) / secondary (outline,
                ghost) / destructive, visually separated on its own edge */}
            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-solid)] px-6 py-4">
              {!editing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
              {active.status === "draft" && (
                <Button
                  size="sm"
                  onClick={() => approveSlot(active)}
                  disabled={approvingIds.has(active.id)}
                >
                  {approvingIds.has(active.id) ? (
                    <span className="zuri-spinner mr-1 !size-3.5" />
                  ) : (
                    <Check className="mr-1 h-3.5 w-3.5" />
                  )}
                  Approve
                </Button>
              )}
              {active.status === "approved" && !active.coming_soon && (
                <Button
                  size="sm"
                  onClick={() => generateContent(active)}
                  disabled={generatingContent}
                >
                  {generatingContent ? (
                    <span className="zuri-spinner mr-1 !size-3.5" />
                  ) : (
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                  )}
                  Generate
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => regenerateSlot(active)}
                disabled={regenerating}
              >
                {regenerating ? (
                  <span className="zuri-spinner mr-1 !size-3.5" />
                ) : (
                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                )}
                Regenerate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => repurposeSlot(active)}
                disabled={repurposing || !growth}
                title={growth ? undefined : "Growth+"}
              >
                {repurposing ? (
                  <span className="zuri-spinner mr-1 !size-3.5" />
                ) : (
                  <Share2 className="mr-1 h-3.5 w-3.5" />
                )}
                Repurpose
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    `${active.topic}\n\n${active.hook ?? ""}\n\n${active.brief ?? ""}`
                  );
                  toast.success("Copied brief");
                }}
              >
                <Copy className="mr-1 h-3.5 w-3.5" />
                Copy
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto border-l border-[var(--border-solid)] pl-3 text-error hover:bg-error/10 hover:text-error"
                onClick={() => deleteSlot(active)}
                disabled={deletingIds.has(active.id)}
              >
                {deletingIds.has(active.id) ? (
                  <span className="zuri-spinner mr-1 !size-3.5" />
                ) : (
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                )}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {seriesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="content-card w-full max-w-md p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold">
                Create content series
              </h2>
              <button
                type="button"
                onClick={() => setSeriesOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4 text-[var(--text-tertiary)]" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="block text-xs text-[var(--text-tertiary)]">
                Template
                <select
                  value={seriesTemplate}
                  onChange={(e) => setSeriesTemplate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[var(--border-solid)] bg-[var(--bg-primary)] px-3 py-2 text-sm"
                >
                  {SERIES_OPTIONS.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name} ({t.post_count} posts)
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-[var(--text-tertiary)]">
                Platform
                <select
                  value={seriesPlatform}
                  onChange={(e) => setSeriesPlatform(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[var(--border-solid)] bg-[var(--bg-primary)] px-3 py-2 text-sm"
                >
                  {["instagram", "facebook", "linkedin", "x", "tiktok"].map(
                    (p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    )
                  )}
                </select>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSeriesOpen(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={() => void createSeries()} disabled={busy}>
                  {busy ? (
                    <span className="zuri-spinner mr-1 !size-3.5" />
                  ) : null}
                  Generate series
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  dot,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  dot?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-all [transition-duration:var(--transition-fast)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,162,39,0.35)] focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        active
          ? "border-transparent bg-[var(--accent)] text-[var(--accent-foreground)]"
          : "border-[var(--border-solid)] text-[var(--text-tertiary)] hover:border-[var(--border-hover)] hover:text-[var(--text-secondary)]"
      )}
    >
      {dot && (
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ background: dot, boxShadow: active ? "none" : `0 0 0 1px ${dot}33` }}
        />
      )}
      {label}
    </button>
  );
}

function SlotCard({
  slot,
  onClick,
  selected,
  open,
  onToggleSelect,
}: {
  slot: SlotWithPillar;
  onClick: () => void;
  selected?: boolean;
  /** True when this card's drawer is the one currently open — gets the
   * full gold-outline focus/active treatment (1.4), distinct from the
   * checkbox multi-select state. */
  open?: boolean;
  onToggleSelect?: (e: React.MouseEvent) => void;
}) {
  const pillarColor = slot.content_pillars?.color ?? "#C9A84C";
  const trendTip = slot.trend_source
    ? `${slot.trend_source.topic} — ${slot.trend_source.angle}`
    : undefined;
  const platform = PLATFORM_META[slot.platform];
  const format = formatMeta(slot.format_type);
  const status = statusStyle(slot);
  const statusLabel = slot.coming_soon ? statusColors.coming_soon.label : status.label;

  return (
    <div
      className={cn(
        "content-card relative flex w-full items-stretch overflow-hidden text-left",
        open && "content-card--active"
      )}
      style={pillarStripeStyle(pillarColor)}
    >
      {/* Checkbox gets its own reserved column so it never overlaps the
          platform/format icons regardless of card width. */}
      {onToggleSelect && (
        <div
          className="flex shrink-0 items-start pl-3 pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={Boolean(selected)}
            onChange={() =>
              onToggleSelect?.({ stopPropagation() {} } as React.MouseEvent)
            }
            className="h-3.5 w-3.5 accent-[#C9A84C]"
            aria-label="Select for preview"
          />
        </div>
      )}
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "min-w-0 flex-1 py-3 pr-3 text-left transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,162,39,0.35)] focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          onToggleSelect ? "pl-2" : "pl-3"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 items-center gap-1">
            {platform && (
              <platform.Icon
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: platform.color }}
                aria-label={platform.label}
              />
            )}
            <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
              <format.Icon className="h-3 w-3 shrink-0" />
              {format.label}
            </span>
          </div>
          {slot.content_pillars?.name && (
            <span
              className="truncate text-[10px] font-medium"
              style={{ color: pillarColor }}
            >
              {slot.content_pillars.name}
            </span>
          )}
          <span className={cn("ml-auto inline-flex shrink-0 items-center gap-1", status.text)}>
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: status.dot }}
            />
            <span className="text-label">{statusLabel}</span>
          </span>
        </div>

        <p className="text-card-title mt-2 truncate">{slot.topic}</p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-card-meta">
            {slot.scheduled_time ? slot.scheduled_time.slice(0, 5) : ""}
          </span>
          {slot.trend_source && (
            <span
              title={trendTip}
              className="inline-flex items-center gap-1 rounded-full border border-[#C9A84C]/40 px-2 py-0 text-[9px] font-medium text-[#C9A84C]"
            >
              <TrendingUp className="h-2.5 w-2.5" />
              Trending
            </span>
          )}
          {slot.generation_source === "fallback" && (
            <span
              title="AI generation failed for this post — this is starter template content, not real AI output."
              className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 px-2 py-0 text-[9px] font-medium text-amber-500"
            >
              Starter content
            </span>
          )}
        </div>
      </button>
    </div>
  );
}
