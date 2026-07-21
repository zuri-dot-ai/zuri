"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Diamond,
  LayoutGrid,
  List,
  Loader2,
  Pencil,
  RefreshCw,
  Share2,
  Trash2,
  Check,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/app/empty-state";
import { RatingsSummaryCard } from "@/components/content/RatingsSummaryCard";
import { GeneratedContentView } from "@/components/content/GeneratedContentView";
import { cn } from "@/lib/utils";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";
import { getNigerianCulturalMoments } from "@/lib/content/cultural-calendar";
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

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "IG",
  facebook: "FB",
  linkedin: "LI",
  x: "X",
  tiktok: "TT",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  approved: "Approved",
  generated: "Generated",
  posted: "Posted",
  skipped: "Skipped",
};

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
  const [view, setView] = useState<"month" | "list">("month");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [pillarFilter, setPillarFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [trendingOnly, setTrendingOnly] = useState(false);
  const [active, setActive] = useState<SlotWithPillar | null>(null);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);
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

  const slotsByDate = useMemo(() => {
    const map = new Map<string, SlotWithPillar[]>();
    for (const s of filtered) {
      const key = s.scheduled_date;
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return map;
  }, [filtered]);

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
      toast.success(
        data.slots_created
          ? `Added ${data.slots_created} posts to ${monthName}`
          : data.message ?? "Calendar ready"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate calendar");
    } finally {
      setGenerating(false);
    }
  }

  async function approveSlot(slot: SlotWithPillar) {
    setBusy(true);
    try {
      const data = await safeFetchJSON<{ slot: SlotWithPillar }>(
        `/api/content/calendar/${slot.id}/approve`,
        { method: "POST" }
      );
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? data.slot : s)));
      setActive(data.slot);
      toast.success("Slot approved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not approve");
    } finally {
      setBusy(false);
    }
  }

  async function regenerateSlot(slot: SlotWithPillar) {
    setBusy(true);
    try {
      const data = await safeFetchJSON<{ slot: SlotWithPillar }>(
        `/api/content/calendar/${slot.id}/regenerate`,
        { method: "POST" }
      );
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? data.slot : s)));
      setActive(data.slot);
      toast.success("Brief regenerated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not regenerate");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSlot(slot: SlotWithPillar) {
    if (!confirm("Delete this calendar slot?")) return;
    setBusy(true);
    try {
      await safeFetchJSON(`/api/content/calendar/${slot.id}`, {
        method: "DELETE",
      });
      setSlots((prev) => prev.filter((s) => s.id !== slot.id));
      setActive(null);
      toast.success("Slot deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setBusy(false);
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
    setBusy(true);
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
      toast.error(e instanceof Error ? e.message : "Could not repurpose");
    } finally {
      setBusy(false);
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
      toast.error(e instanceof Error ? e.message : "Could not create series");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(slot: SlotWithPillar) {
    setBusy(true);
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
      setBusy(false);
    }
  }

  async function generateContent(slot: SlotWithPillar) {
    setBusy(true);
    try {
      const output = await safeFetchJSON<{ id: string }>(
        "/api/content/generate",
        {
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
        }
      );
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
      toast.success("Content generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate content");
    } finally {
      setBusy(false);
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

  const { lastDay } = monthBounds(year, month);
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0 Sun
  // Start week on Monday
  const startOffset = (firstWeekday + 6) % 7;
  const cells: Array<{ day: number | null }> = [
    ...Array.from({ length: startOffset }, () => ({ day: null })),
    ...Array.from({ length: lastDay }, (_, i) => ({ day: i + 1 })),
  ];
  while (cells.length % 7 !== 0) cells.push({ day: null });

  const platformsInUse = Array.from(new Set(slots.map((s) => s.platform)));

  return (
    <div className="mx-auto max-w-6xl">
      <header className="page-head flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Content</h1>
          <p className="mt-1 text-sm text-[var(--zuri-muted)]">
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
          <div className="ml-2 flex rounded-md border border-[var(--zuri-border)]">
            <Button
              variant="ghost"
              size="icon"
              className={cn(view === "month" && "bg-[var(--zuri-surface)]")}
              onClick={() => setView("month")}
              aria-label="Month view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(view === "list" && "bg-[var(--zuri-surface)]")}
              onClick={() => setView("list")}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

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
            label={PLATFORM_LABELS[p] ?? p}
          />
        ))}
        <span className="mx-1 w-px self-stretch bg-[var(--zuri-border)]" />
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
        <span className="mx-1 w-px self-stretch bg-[var(--zuri-border)]" />
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
                    : STATUS_LABELS[s]
              }
            />
          )
        )}
        <span className="mx-1 w-px self-stretch bg-[var(--zuri-border)]" />
        <FilterChip
          active={trendingOnly}
          onClick={() => setTrendingOnly((v) => !v)}
          label="Trending"
        />
      </div>

      {(selectedIds.size > 0 ||
        lastSeriesIds.length > 0 ||
        lastRepurposeIds.length > 0) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--zuri-border)] bg-[var(--zuri-surface)] px-3 py-2">
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

      {filtered.length > 0 && view === "month" && (
        <div className="overflow-x-auto rounded-lg border border-[var(--zuri-border)]">
          <div className="grid min-w-[700px] grid-cols-7 border-b border-[var(--zuri-border)] bg-[var(--zuri-surface)] text-center text-xs font-medium text-[var(--zuri-muted)]">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="px-2 py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid min-w-[700px] grid-cols-7">
            {cells.map((cell, idx) => {
              if (cell.day == null) {
                return (
                  <div
                    key={`e-${idx}`}
                    className="min-h-[110px] border-b border-r border-[var(--zuri-border)] bg-[var(--zuri-bg)]/40"
                  />
                );
              }
              const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
              const daySlots = slotsByDate.get(dateKey) ?? [];
              const cultural = culturalByDay.get(cell.day);
              return (
                <div
                  key={dateKey}
                  className="min-h-[110px] border-b border-r border-[var(--zuri-border)] p-1.5"
                >
                  <div className="mb-1 flex items-center justify-between px-0.5">
                    <span className="text-xs font-medium text-[var(--zuri-muted)]">
                      {cell.day}
                    </span>
                    {cultural && (
                      <span title={cultural} className="text-[#C9A84C]">
                        <Diamond className="h-3 w-3 fill-current" />
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {daySlots.slice(0, 3).map((slot) => (
                      <SlotCard
                        key={slot.id}
                        slot={slot}
                        compact
                        selected={selectedIds.has(slot.id)}
                        onToggleSelect={(e) => toggleSelect(slot.id, e)}
                        onClick={() => openSlot(slot)}
                      />
                    ))}
                    {daySlots.length > 3 && (
                      <p className="px-1 text-[10px] text-[var(--zuri-muted)]">
                        +{daySlots.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filtered.length > 0 && view === "list" && (
        <div className="space-y-2">
          {filtered
            .slice()
            .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
            .map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                selected={selectedIds.has(slot.id)}
                onToggleSelect={(e) => toggleSelect(slot.id, e)}
                onClick={() => openSlot(slot)}
              />
            ))}
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
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Regenerate / add more
          </Button>
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-md flex-col border-l border-[var(--zuri-border)] bg-[var(--zuri-bg)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--zuri-border)] px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--zuri-muted)]">
                  {PLATFORM_LABELS[active.platform] ?? active.platform} ·{" "}
                  {active.format_type.replace(/_/g, " ")}
                </p>
                <p className="text-sm font-medium">
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

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {active.coming_soon
                    ? "Coming Soon"
                    : STATUS_LABELS[active.status] ?? active.status}
                </Badge>
                {active.content_pillars && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-[var(--zuri-muted)]">
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
                {active.is_cultural_moment && (
                  <Badge variant="muted">
                    {active.cultural_moment_name ?? "Cultural moment"}
                  </Badge>
                )}
              </div>

              {editing ? (
                <div className="space-y-3">
                  <label className="block text-xs text-[var(--zuri-muted)]">
                    Topic
                    <input
                      className="mt-1 w-full rounded-md border border-[var(--zuri-border)] bg-transparent px-3 py-2 text-sm"
                      value={editTopic}
                      onChange={(e) => setEditTopic(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs text-[var(--zuri-muted)]">
                    Hook
                    <input
                      className="mt-1 w-full rounded-md border border-[var(--zuri-border)] bg-transparent px-3 py-2 text-sm"
                      value={editHook}
                      onChange={(e) => setEditHook(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs text-[var(--zuri-muted)]">
                    Brief
                    <textarea
                      className="mt-1 w-full rounded-md border border-[var(--zuri-border)] bg-transparent px-3 py-2 text-sm"
                      rows={4}
                      value={editBrief}
                      onChange={(e) => setEditBrief(e.target.value)}
                    />
                  </label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveEdit(active)}
                      disabled={busy}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-[var(--zuri-muted)]">Topic</p>
                    <p className="mt-0.5 text-sm font-medium">{active.topic}</p>
                  </div>
                  {active.hook && (
                    <div>
                      <p className="text-xs text-[var(--zuri-muted)]">Hook</p>
                      <p className="mt-0.5 text-sm italic">“{active.hook}”</p>
                    </div>
                  )}
                  {active.brief && (
                    <div>
                      <p className="text-xs text-[var(--zuri-muted)]">Brief</p>
                      <p className="mt-0.5 text-sm text-[var(--zuri-muted)]">
                        {active.brief}
                      </p>
                    </div>
                  )}
                  {active.trend_source && (
                    <div className="rounded-md border border-[#C9A84C]/40 bg-[#C9A84C]/5 px-3 py-2">
                      <p className="flex items-center gap-1 text-xs font-medium text-[#C9A84C]">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Trending
                      </p>
                      <p className="mt-1 text-sm text-[var(--zuri-foreground)]">
                        {active.trend_source.topic}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--zuri-muted)]">
                        {active.trend_source.angle}
                      </p>
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

            <div className="flex flex-wrap gap-2 border-t border-[var(--zuri-border)] p-4">
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
                  variant="outline"
                  onClick={() => approveSlot(active)}
                  disabled={busy}
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Approve
                </Button>
              )}
              {active.status === "approved" && !active.coming_soon && (
                <Button
                  size="sm"
                  onClick={() => generateContent(active)}
                  disabled={busy}
                >
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Generate
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => regenerateSlot(active)}
                disabled={busy}
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                Regenerate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => repurposeSlot(active)}
                disabled={busy || !growth}
                title={growth ? undefined : "Growth+"}
              >
                <Share2 className="mr-1 h-3.5 w-3.5" />
                Repurpose
              </Button>
              <Button
                size="sm"
                variant="outline"
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
                className="text-red-400"
                onClick={() => deleteSlot(active)}
                disabled={busy}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {seriesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-[var(--zuri-border)] bg-[var(--zuri-surface)] p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold">
                Create content series
              </h2>
              <button
                type="button"
                onClick={() => setSeriesOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4 text-[var(--zuri-muted)]" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="block text-xs text-[var(--zuri-muted)]">
                Template
                <select
                  value={seriesTemplate}
                  onChange={(e) => setSeriesTemplate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[var(--zuri-border)] bg-[var(--zuri-bg)] px-3 py-2 text-sm"
                >
                  {SERIES_OPTIONS.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name} ({t.post_count} posts)
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-[var(--zuri-muted)]">
                Platform
                <select
                  value={seriesPlatform}
                  onChange={(e) => setSeriesPlatform(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[var(--zuri-border)] bg-[var(--zuri-bg)] px-3 py-2 text-sm"
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
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition",
        active
          ? "border-[var(--zuri-gold)] bg-[var(--zuri-gold)]/10 text-[var(--zuri-foreground)]"
          : "border-[var(--zuri-border)] text-[var(--zuri-muted)] hover:border-[var(--zuri-muted)]"
      )}
    >
      {dot && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: dot }}
        />
      )}
      {label}
    </button>
  );
}

function SlotCard({
  slot,
  onClick,
  compact,
  selected,
  onToggleSelect,
}: {
  slot: SlotWithPillar;
  onClick: () => void;
  compact?: boolean;
  selected?: boolean;
  onToggleSelect?: (e: React.MouseEvent) => void;
}) {
  const color = slot.content_pillars?.color ?? "#C9A84C";
  const trendTip = slot.trend_source
    ? `${slot.trend_source.topic} — ${slot.trend_source.angle}`
    : undefined;

  return (
    <div
      className={cn(
        "relative w-full rounded-md border bg-[var(--zuri-surface)] text-left transition hover:border-[var(--zuri-gold)]/50",
        selected
          ? "border-[var(--zuri-gold)]"
          : "border-[var(--zuri-border)]",
        compact ? "px-1.5 py-1" : "px-3 py-2.5"
      )}
    >
      {onToggleSelect && (
        <label
          className="absolute left-1 top-1 z-10"
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
        </label>
      )}
      <button
        type="button"
        onClick={onClick}
        className={cn("w-full text-left", onToggleSelect && "pl-4")}
      >
        <div className="flex items-start gap-1.5">
          <span
            className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: color }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] font-semibold uppercase text-[var(--zuri-muted)]">
                {PLATFORM_LABELS[slot.platform] ?? slot.platform}
              </span>
              {!compact && (
                <span className="text-[10px] text-[var(--zuri-muted)]">
                  · {slot.format_type.replace(/_/g, " ")}
                </span>
              )}
              {slot.trend_source && (
                <span
                  title={trendTip}
                  className="inline-flex items-center gap-0.5 rounded-full border border-[#C9A84C] px-1.5 py-0 text-[9px] font-medium text-[#C9A84C]"
                >
                  <TrendingUp className="h-2.5 w-2.5" />
                  Trending
                </span>
              )}
              {slot.coming_soon ? (
                <Badge className="ml-auto h-4 px-1 text-[9px]" variant="muted">
                  Soon
                </Badge>
              ) : (
                <Badge className="ml-auto h-4 px-1 text-[9px]" variant="outline">
                  {STATUS_LABELS[slot.status] ?? slot.status}
                </Badge>
              )}
            </div>
            <p
              className={cn(
                "truncate text-[var(--zuri-foreground)]",
                compact ? "text-[11px] leading-tight" : "text-sm"
              )}
            >
              {slot.topic}
            </p>
            {!compact && (
              <p className="mt-0.5 text-xs text-[var(--zuri-muted)]">
                {new Date(slot.scheduled_date).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}
