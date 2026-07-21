"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentRatingStars } from "@/components/content/ContentRatingStars";
import { getAspectRatio } from "@/lib/content/image-dimensions";
import { cn } from "@/lib/utils";

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  x: "X",
  tiktok: "TikTok",
};

function aspectClass(ratio: string): string {
  switch (ratio) {
    case "4:5":
      return "aspect-[4/5]";
    case "9:16":
      return "aspect-[9/16]";
    case "16:9":
      return "aspect-video";
    case "3:4":
      return "aspect-[3/4]";
    default:
      return "aspect-square";
  }
}

export type PreviewFrameItem = {
  slotId: string;
  contentId?: string | null;
  platform: string;
  formatType: string;
  topic: string;
  scheduledDate: string | null;
  caption?: string | null;
  hashtags?: string[];
  imageUrl?: string | null;
  status?: string | null;
  rating?: number | null;
  generated: boolean;
};

export function DeviceFrameCard({
  item,
  onGenerate,
  generating,
}: {
  item: PreviewFrameItem;
  onGenerate?: (slotId: string) => void;
  generating?: boolean;
}) {
  const ratio = getAspectRatio(item.platform, item.formatType);
  const dateLabel = item.scheduledDate
    ? new Date(item.scheduledDate).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <article
      className={cn(
        "flex w-full max-w-[320px] shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--zuri-border)] bg-[var(--zuri-surface)]",
        !item.generated && "opacity-60"
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-[var(--zuri-border)] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-8 w-8 shrink-0 rounded-full bg-[var(--zuri-border)]" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--zuri-foreground)]">
              Your Business
            </p>
            <p className="text-[10px] uppercase tracking-wide text-[var(--zuri-muted)]">
              {PLATFORM_LABELS[item.platform] ?? item.platform}
            </p>
          </div>
        </div>
        {dateLabel && (
          <span className="shrink-0 text-[10px] text-[var(--zuri-muted)]">
            {dateLabel}
          </span>
        )}
      </header>

      {!item.generated ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-3 bg-[var(--zuri-bg)] px-4 py-10",
            aspectClass(ratio)
          )}
        >
          <p className="text-center text-sm text-[var(--zuri-muted)]">
            Not generated yet
          </p>
          <p className="text-center text-xs text-[var(--zuri-muted)] line-clamp-2">
            {item.topic}
          </p>
          {onGenerate && (
            <Button
              size="sm"
              onClick={() => onGenerate(item.slotId)}
              disabled={generating}
            >
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              Generate
            </Button>
          )}
        </div>
      ) : (
        <>
          <div
            className={cn(
              "relative w-full overflow-hidden bg-[var(--zuri-bg)]",
              aspectClass(ratio)
            )}
          >
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-xs text-[var(--zuri-muted)]">
                {item.topic}
              </div>
            )}
          </div>

          <div className="space-y-2 border-t border-[var(--zuri-border)] px-3 py-3">
            {item.caption && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--zuri-foreground)]">
                {item.caption}
              </p>
            )}
            {item.hashtags && item.hashtags.length > 0 && (
              <p className="border-t border-[var(--zuri-border)] pt-2 text-xs text-[#C9A84C]">
                {item.hashtags.join(" ")}
              </p>
            )}
            {item.contentId && (
              <ContentRatingStars
                contentId={item.contentId}
                initialRating={item.rating ?? 0}
                className="pt-1"
              />
            )}
          </div>
        </>
      )}
    </article>
  );
}
