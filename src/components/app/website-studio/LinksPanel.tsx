"use client";

import { Link2 } from "lucide-react";
import {
  formatLinkSlotLabel,
  isCtaLinkSlot,
} from "@/lib/website/link-slots";
import type { LinkSlotsHealReason } from "@/lib/website/link-slots";
import type { ResolvedLink } from "@/types/website";

const HEAL_REASON_COPY: Record<LinkSlotsHealReason, string | null> = {
  ok: null,
  already_present: null,
  no_template_id:
    "This site is missing a template reference, so links can’t be healed automatically. Regenerate your website.",
  fetch_failed:
    "We couldn’t load the latest template from storage. Refresh this page, or try again in a moment.",
  storage_missing_slots:
    "The template in storage still has no editable link slots. Templates may still be updating — reload after a few minutes, or regenerate.",
  recompose_failed:
    "We found link slots in storage but couldn’t update this site’s HTML. Reload once; if this persists, regenerate your website.",
};

export function LinksPanel({
  linkSlots,
  filledLinks,
  onOpenSlot,
  healFailed = false,
  healReason,
}: {
  linkSlots: string[];
  filledLinks: Record<string, ResolvedLink>;
  onOpenSlot: (slot: string) => void;
  /** True when ensureLinkSlots could not heal missing data-link-slot markup. */
  healFailed?: boolean;
  healReason?: LinkSlotsHealReason;
}) {
  if (linkSlots.length === 0) {
    const reasonHint =
      healFailed && healReason ? HEAL_REASON_COPY[healReason] : null;
    return (
      <div className="space-y-2">
        <p className="text-card-body">
          {healFailed
            ? "Link editing isn’t available on this site yet. Open this page again after templates finish updating — or regenerate your website."
            : "No editable links found for this template. Refresh this page once; if this persists, regenerate your website so it picks up the latest template."}
        </p>
        {reasonHint && <p className="text-card-meta">{reasonHint}</p>}
        <p className="text-card-meta">
          Templates need <code className="text-xs">data-link-slot</code> on
          CTA and nav links. When storage templates are updated, stale site
          HTML is recomposed automatically on reload.
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
