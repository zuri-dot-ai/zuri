"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ContentRatingStars } from "@/components/content/ContentRatingStars";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";
import type { GeneratedContentRow } from "@/lib/content/types";

type ContentPayload = Pick<
  GeneratedContentRow,
  | "id"
  | "caption"
  | "hashtags"
  | "image_url"
  | "platform"
  | "format_type"
  | "status"
> & { rating?: number | null };

export function GeneratedContentView({
  contentId,
  calendarSlotId,
  onCaptionSaved,
}: {
  contentId?: string | null;
  calendarSlotId?: string | null;
  onCaptionSaved?: (caption: string) => void;
}) {
  const [content, setContent] = useState<ContentPayload | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = contentId
        ? `id=${encodeURIComponent(contentId)}`
        : calendarSlotId
          ? `slotId=${encodeURIComponent(calendarSlotId)}`
          : null;
      if (!q) {
        setContent(null);
        return;
      }
      const data = await safeFetchJSON<{ content: ContentPayload | null }>(
        `/api/content/generated?${q}`
      );
      setContent(data.content);
      setCaption(data.content?.caption ?? "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load content");
      setContent(null);
    } finally {
      setLoading(false);
    }
  }, [contentId, calendarSlotId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveCaption() {
    if (!content?.id) return;
    setSaving(true);
    try {
      await safeFetchJSON(`/api/content/${content.id}/edit-caption`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption }),
      });
      setContent((prev) => (prev ? { ...prev, caption } : prev));
      onCaptionSaved?.(caption);
      toast.success("Caption saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save caption");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-[var(--zuri-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading generated content…
      </div>
    );
  }

  if (!content) {
    return (
      <p className="py-2 text-sm text-[var(--zuri-muted)]">
        No generated content yet for this slot.
      </p>
    );
  }

  const hashtags = Array.isArray(content.hashtags) ? content.hashtags : [];

  return (
    <div className="space-y-4 border-t border-[var(--zuri-border)] pt-4">
      {content.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={content.image_url}
          alt=""
          className="max-h-64 w-full rounded-md border border-[var(--zuri-border)] object-cover"
        />
      )}

      <div className="space-y-1.5">
        <label className="text-xs text-[var(--zuri-muted)]">Caption</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={6}
          className="w-full rounded-md border border-[var(--zuri-border)] bg-[var(--zuri-bg)] px-3 py-2 text-sm text-[var(--zuri-foreground)] focus:border-[var(--zuri-gold)] focus:outline-none"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => void saveCaption()}
          disabled={saving || caption === (content.caption ?? "")}
        >
          {saving ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="mr-1 h-3.5 w-3.5" />
          )}
          Save caption
        </Button>
      </div>

      {hashtags.length > 0 && (
        <div>
          <p className="text-xs text-[var(--zuri-muted)]">Hashtags</p>
          <p className="mt-1 text-sm text-[var(--zuri-gold)]">
            {hashtags.join(" ")}
          </p>
        </div>
      )}

      <ContentRatingStars
        contentId={content.id}
        initialRating={content.rating ?? 0}
      />
    </div>
  );
}
