"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Save } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ContentRatingStars } from "@/components/content/ContentRatingStars";
import { CONTENT_IMAGES_ENABLED } from "@/lib/content/feature-flags";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";
import { cn } from "@/lib/utils";
import type { GeneratedContentRow, PlatformVariants } from "@/lib/content/types";

type VariantTab = "instagram" | "whatsapp" | "x";

type ContentPayload = Pick<
  GeneratedContentRow,
  | "id"
  | "caption"
  | "hashtags"
  | "image_url"
  | "platform"
  | "format_type"
  | "status"
  | "platform_variants"
> & { rating?: number | null };

const TABS: { id: VariantTab; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "x", label: "X" },
];

function fallbackVariants(
  caption: string,
  hashtags: string[]
): PlatformVariants {
  return {
    instagram: { caption, hashtags },
    whatsapp: { caption: caption.slice(0, 280) },
    x: { caption: caption.slice(0, 280) },
  };
}

export function GeneratedContentView({
  contentId,
  calendarSlotId,
  onCaptionSaved,
  refreshKey,
}: {
  contentId?: string | null;
  calendarSlotId?: string | null;
  onCaptionSaved?: (caption: string) => void;
  refreshKey?: number;
}) {
  const [content, setContent] = useState<ContentPayload | null>(null);
  const [tab, setTab] = useState<VariantTab>("instagram");
  const [drafts, setDrafts] = useState<Record<VariantTab, string>>({
    instagram: "",
    whatsapp: "",
    x: "",
  });
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
      const caption = data.content?.caption ?? "";
      const tags = Array.isArray(data.content?.hashtags)
        ? data.content!.hashtags
        : [];
      const variants =
        data.content?.platform_variants ?? fallbackVariants(caption, tags);
      setDrafts({
        instagram: variants.instagram.caption,
        whatsapp: variants.whatsapp.caption,
        x: variants.x.caption,
      });
      const primary = (data.content?.platform ?? "instagram") as VariantTab;
      setTab(
        primary === "x" || primary === "instagram" || primary === "whatsapp"
          ? primary
          : "instagram"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load content");
      setContent(null);
    } finally {
      setLoading(false);
    }
  }, [contentId, calendarSlotId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const variants = useMemo(() => {
    if (!content) return null;
    const tags = Array.isArray(content.hashtags) ? content.hashtags : [];
    return content.platform_variants ?? fallbackVariants(content.caption ?? "", tags);
  }, [content]);

  const activeHashtags =
    tab === "instagram" ? (variants?.instagram.hashtags ?? []) : [];

  async function saveCaption() {
    if (!content?.id) return;
    setSaving(true);
    try {
      const nextVariants: PlatformVariants = {
        instagram: {
          caption: drafts.instagram,
          hashtags: variants?.instagram.hashtags ?? content.hashtags ?? [],
        },
        whatsapp: { caption: drafts.whatsapp },
        x: { caption: drafts.x },
      };
      // Primary caption stays the slot platform / Instagram tab for compatibility
      const primaryCaption =
        content.platform === "x"
          ? drafts.x
          : content.platform === "instagram"
            ? drafts.instagram
            : drafts[tab];

      await safeFetchJSON(`/api/content/${content.id}/edit-caption`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: primaryCaption,
          platform_variants: nextVariants,
        }),
      });
      setContent((prev) =>
        prev
          ? {
              ...prev,
              caption: primaryCaption,
              platform_variants: nextVariants,
            }
          : prev
      );
      onCaptionSaved?.(primaryCaption);
      toast.success("Caption saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save caption");
    } finally {
      setSaving(false);
    }
  }

  async function copyActive() {
    const text =
      tab === "instagram" && activeHashtags.length > 0
        ? `${drafts.instagram}\n\n${activeHashtags.join(" ")}`
        : drafts[tab];
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied — paste into your app to post");
    } catch {
      toast.error("Could not copy");
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 border-t border-[var(--border-solid)] pt-4">
        <div className="h-9 w-full animate-pulse rounded-md bg-muted/40" />
        <div className="h-32 w-full animate-pulse rounded-md bg-muted/40" />
      </div>
    );
  }

  if (!content) {
    return (
      <p className="py-2 text-sm text-[var(--text-tertiary)]">
        No generated content yet for this slot.
      </p>
    );
  }

  return (
    <div className="space-y-4 border-t border-[var(--border-solid)] pt-4">
      {CONTENT_IMAGES_ENABLED && content.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={content.image_url}
          alt=""
          className="max-h-64 w-full rounded-md border border-[var(--border-solid)] object-cover"
        />
      )}

      <div
        role="tablist"
        aria-label="Platform formats"
        className="flex rounded-md border border-border bg-muted/30 p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative flex-1 rounded-sm px-2 py-1.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "text-[var(--text-primary)]"
                : "text-muted-foreground hover:text-[var(--text-secondary)]"
            )}
          >
            {tab === t.id && (
              <motion.span
                layoutId="variant-tab"
                className="absolute inset-0 rounded-sm bg-[var(--bg-elevated)] shadow-sm"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-label block">
          {tab === "whatsapp"
            ? "WhatsApp Status / Broadcast"
            : tab === "x"
              ? "X / Twitter"
              : "Instagram caption"}
        </label>
        <textarea
          value={drafts[tab]}
          onChange={(e) =>
            setDrafts((prev) => ({ ...prev, [tab]: e.target.value }))
          }
          rows={tab === "x" || tab === "whatsapp" ? 4 : 6}
          className="w-full rounded-md border border-[var(--border-solid)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors [transition-duration:var(--transition-fast)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void saveCaption()}
            disabled={saving}
          >
            {saving ? (
              <span className="zuri-spinner mr-1 !size-3.5" />
            ) : (
              <Save className="mr-1 h-3.5 w-3.5" />
            )}
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void copyActive()}>
            <Copy className="mr-1 h-3.5 w-3.5" />
            Copy
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Review in Zuri, then copy into your social apps. Auto-posting is not
          connected.
        </p>
      </div>

      {tab === "instagram" && activeHashtags.length > 0 && (
        <div>
          <p className="text-label">Suggested hashtags</p>
          <p className="mt-1 text-sm text-[var(--accent)]">
            {activeHashtags.join(" ")}
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
