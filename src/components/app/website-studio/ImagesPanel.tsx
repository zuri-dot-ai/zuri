"use client";

import { ImagePlus } from "lucide-react";
import type { DesignArchetype, ResolvedImage } from "@/types/website";
import { isBrokenImageUrl } from "@/lib/website/image-url";

export function ImagesPanel({
  filledImages,
  imageSlots,
  archetype,
  onOpenSlot,
}: {
  filledImages: Record<string, ResolvedImage>;
  imageSlots: string[];
  archetype: DesignArchetype | null;
  onOpenSlot: (slot: string) => void;
}) {
  void archetype;
  const slots =
    imageSlots.length > 0 ? imageSlots : Object.keys(filledImages);

  if (slots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No image slots found for this template.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {slots.map((slot) => {
        const image = filledImages[slot];
        const broken = !image?.url || isBrokenImageUrl(image.url);
        return (
          <button
            key={slot}
            type="button"
            id={`slot-${slot}`}
            onClick={() => onOpenSlot(slot)}
            className="flex w-full gap-4 rounded-sm border border-border bg-background p-3 text-left transition-colors hover:border-gold/50"
          >
            <div className="size-20 shrink-0 overflow-hidden rounded-sm border border-border bg-surface">
              {!broken ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image!.url}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                  Empty
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2 self-center">
              <p className="text-sm font-medium capitalize">
                {slot.replace(/_/g, " ")}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {broken ? "Needs an image" : (image?.source ?? "Set")}
              </p>
              <span className="inline-flex items-center gap-1 text-xs text-gold">
                <ImagePlus className="size-3.5" />
                Change
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
