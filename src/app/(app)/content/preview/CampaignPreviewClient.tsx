"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DeviceFrameCard,
  type PreviewFrameItem,
} from "@/components/content/DeviceFrameCard";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";
import { cn } from "@/lib/utils";

type SlotSeed = {
  id: string;
  platform: string;
  format_type: string;
  topic: string;
  hook: string | null;
  brief: string | null;
  scheduled_date: string | null;
  content_id: string | null;
  status: string;
};

type GeneratedItem = {
  id: string;
  platform: string;
  format_type: string;
  caption: string | null;
  hashtags: string[] | null;
  image_url: string | null;
  status: string;
  calendar_slot_id: string | null;
};

export function CampaignPreviewClient({
  initialSlots,
}: {
  initialSlots: SlotSeed[];
}) {
  const router = useRouter();
  const [slots, setSlots] = useState(initialSlots);
  const [itemsBySlot, setItemsBySlot] = useState<
    Record<string, GeneratedItem>
  >({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [groupBy, setGroupBy] = useState<"platform" | "date">("date");
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const contentIds = initialSlots
          .map((s) => s.content_id)
          .filter((id): id is string => Boolean(id));

        if (contentIds.length > 0) {
          const data = await safeFetchJSON<{ items: GeneratedItem[] }>(
            `/api/content/preview-batch?ids=${contentIds.join(",")}`
          );
          if (cancelled) return;
          const map: Record<string, GeneratedItem> = {};
          for (const item of data.items ?? []) {
            const slotId =
              item.calendar_slot_id ??
              initialSlots.find((s) => s.content_id === item.id)?.id;
            if (slotId) map[slotId] = item;
          }
          setItemsBySlot(map);

          try {
            const summary = await safeFetchJSON<{
              ratings: {
                rating: number;
                generated_content?: { id?: string } | null;
              }[];
            }>("/api/content/ratings-summary");
            if (cancelled) return;
            const idSet = new Set(contentIds);
            const ratingMap: Record<string, number> = {};
            for (const r of summary.ratings ?? []) {
              const cid = r.generated_content?.id;
              if (cid && idSet.has(cid)) ratingMap[cid] = r.rating;
            }
            setRatings(ratingMap);
          } catch {
            /* optional */
          }
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(
            e instanceof Error ? e.message : "Could not load preview"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialSlots]);

  const frames: PreviewFrameItem[] = useMemo(() => {
    return slots.map((slot) => {
      const gen = itemsBySlot[slot.id];
      const ready =
        gen &&
        (gen.status === "ready" ||
          gen.status === "partial" ||
          Boolean(gen.caption || gen.image_url));

      return {
        slotId: slot.id,
        contentId: gen?.id ?? slot.content_id,
        platform: slot.platform,
        formatType: slot.format_type,
        topic: slot.topic,
        scheduledDate: slot.scheduled_date,
        caption: gen?.caption,
        hashtags: gen?.hashtags ?? [],
        imageUrl: gen?.image_url,
        status: gen?.status,
        rating: gen?.id ? ratings[gen.id] ?? null : null,
        generated: Boolean(ready),
      };
    });
  }, [slots, itemsBySlot, ratings]);

  const grouped = useMemo(() => {
    const map = new Map<string, PreviewFrameItem[]>();
    const sorted = [...frames].sort((a, b) => {
      if (groupBy === "platform") {
        return a.platform.localeCompare(b.platform);
      }
      return (a.scheduledDate ?? "").localeCompare(b.scheduledDate ?? "");
    });
    for (const f of sorted) {
      const key =
        groupBy === "platform"
          ? f.platform
          : f.scheduledDate ?? "unscheduled";
      const list = map.get(key) ?? [];
      list.push(f);
      map.set(key, list);
    }
    return map;
  }, [frames, groupBy]);

  const notGenerated = frames.filter((f) => !f.generated).length;

  async function generateSlot(slotId: string) {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;
    setGeneratingId(slotId);
    try {
      const output = await safeFetchJSON<{
        id: string;
        caption?: string;
        hashtags?: string[];
        imageUrl?: string;
        status: string;
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
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? { ...s, content_id: output.id, status: "generated" }
            : s
        )
      );
      setItemsBySlot((prev) => ({
        ...prev,
        [slotId]: {
          id: output.id,
          platform: slot.platform,
          format_type: slot.format_type,
          caption: output.caption ?? null,
          hashtags: output.hashtags ?? [],
          image_url: output.imageUrl ?? null,
          status: output.status,
          calendar_slot_id: slotId,
        },
      }));
      toast.success("Content generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate");
    } finally {
      setGeneratingId(null);
    }
  }

  function exportCaptions() {
    const text = frames
      .filter((f) => f.generated && f.caption)
      .map((f) => {
        const tags = f.hashtags?.length ? `\n${f.hashtags.join(" ")}` : "";
        return `—— ${f.platform.toUpperCase()} · ${f.scheduledDate ?? ""} ——\n${f.caption}${tags}`;
      })
      .join("\n\n");
    if (!text) {
      toast.error("No captions to export yet");
      return;
    }
    void navigator.clipboard.writeText(text);
    toast.success("Captions copied to clipboard");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[var(--zuri-foreground)]">
            Campaign preview
          </h1>
          <p className="mt-1 text-sm text-[var(--zuri-muted)]">
            {frames.length} post{frames.length === 1 ? "" : "s"}
            {notGenerated > 0 ? ` · ${notGenerated} not generated yet` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-[var(--zuri-border)]">
            <button
              type="button"
              onClick={() => setGroupBy("date")}
              className={cn(
                "px-3 py-1.5 text-xs",
                groupBy === "date"
                  ? "bg-[var(--zuri-gold)]/10 text-[var(--zuri-foreground)]"
                  : "text-[var(--zuri-muted)]"
              )}
            >
              By date
            </button>
            <button
              type="button"
              onClick={() => setGroupBy("platform")}
              className={cn(
                "px-3 py-1.5 text-xs",
                groupBy === "platform"
                  ? "bg-[var(--zuri-gold)]/10 text-[var(--zuri-foreground)]"
                  : "text-[var(--zuri-muted)]"
              )}
            >
              By platform
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={exportCaptions}>
            <Copy className="mr-1 h-3.5 w-3.5" />
            Export All Captions
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/content">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Back to Calendar
            </Link>
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--zuri-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading preview…
        </div>
      ) : frames.length === 0 ? (
        <p className="text-sm text-[var(--zuri-muted)]">
          No slots selected.{" "}
          <button
            type="button"
            className="text-[#C9A84C] underline"
            onClick={() => router.push("/content")}
          >
            Back to calendar
          </button>
        </p>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([key, group]) => (
            <section key={key}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--zuri-muted)]">
                {groupBy === "platform"
                  ? key
                  : key === "unscheduled"
                    ? "Unscheduled"
                    : new Date(key).toLocaleDateString("en-NG", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
              </h2>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap sm:items-start">
                {group.map((item) => (
                  <DeviceFrameCard
                    key={item.slotId}
                    item={item}
                    onGenerate={generateSlot}
                    generating={generatingId === item.slotId}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
