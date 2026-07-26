"use client";

import { Link2 } from "lucide-react";
import {
  formatLinkSlotLabel,
  isCtaLinkSlot,
} from "@/lib/website/link-slots";
import type { ResolvedLink } from "@/types/website";

export function LinksPanel({
  linkSlots,
  filledLinks,
  onOpenSlot,
}: {
  linkSlots: string[];
  filledLinks: Record<string, ResolvedLink>;
  onOpenSlot: (slot: string) => void;
}) {
  if (linkSlots.length === 0) {
    return (
      <p className="text-card-body">
        No editable links found for this template. Re-publish or regenerate
        after templates are updated.
      </p>
    );
  }

  const ctas = linkSlots.filter(isCtaLinkSlot);
  const navs = linkSlots.filter((s) => !isCtaLinkSlot(s));

  function renderGroup(title: string, slots: string[]) {
    if (slots.length === 0) return null;
    return (
      <div className="space-y-2">
        <p className="text-label">{title}</p>
        {slots.map((slot) => {
          const link = filledLinks[slot];
          return (
            <button
              key={slot}
              type="button"
              onClick={() => onOpenSlot(slot)}
              className="content-card flex w-full items-center gap-3 p-3 text-left"
            >
              <Link2 className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-card-title">{formatLinkSlotLabel(slot)}</p>
                <p className="truncate text-card-meta">
                  {link?.href || "Default template link"}
                </p>
              </div>
              <span className="text-xs text-gold">Edit</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {renderGroup("Buttons", ctas)}
      {renderGroup("Navigation", navs)}
    </div>
  );
}
