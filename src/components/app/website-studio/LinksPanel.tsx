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
  healFailed = false,
}: {
  linkSlots: string[];
  filledLinks: Record<string, ResolvedLink>;
  onOpenSlot: (slot: string) => void;
  /** True when ensureLinkSlots could not heal missing data-link-slot markup. */
  healFailed?: boolean;
}) {
  if (linkSlots.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-card-body">
          {healFailed
            ? "Link editing isn’t available on this site yet. Open this page again after templates finish updating — or regenerate your website."
            : "No editable links found for this template. Refresh this page once; if this persists, regenerate your website so it picks up the latest template."}
        </p>
        <p className="text-card-meta">
          Templates need <code className="text-xs">data-link-slot</code> on
          CTA and nav links. Storage templates were updated; stale site HTML
          is recomposed automatically when you reload.
        </p>
      </div>
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
