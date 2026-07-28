"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";
import {
  formatLinkSlotLabel,
  isCtaLinkSlot,
} from "@/lib/website/link-slots";
import type { ResolvedLink } from "@/types/website";
import { StudioModal } from "./StudioModal";

type LinkMode = "internal" | "external";

export function LinkEditorModal({
  slot,
  initialHref,
  initialLabel,
  existing,
  open,
  onClose,
  onUpdated,
}: {
  slot: string;
  initialHref?: string;
  initialLabel?: string;
  existing?: ResolvedLink | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (
    slot: string,
    link: ResolvedLink | null,
    needsReview?: boolean
  ) => void;
}) {
  const isCta = isCtaLinkSlot(slot);
  const seedHref = existing?.href || initialHref || "";
  const seedIsInternal = seedHref.startsWith("#") || !seedHref;

  const [mode, setMode] = useState<LinkMode>(
    seedIsInternal ? "internal" : "external"
  );
  const [href, setHref] = useState(
    seedHref || (seedIsInternal ? "#contact" : "https://")
  );
  const [label, setLabel] = useState(existing?.label || initialLabel || "");
  const [openInNewTab, setOpenInNewTab] = useState(
    existing?.target ? existing.target === "_blank" : !seedIsInternal
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const nextHref = existing?.href || initialHref || "";
    const internal = nextHref.startsWith("#") || !nextHref;
    setMode(internal ? "internal" : "external");
    setHref(nextHref || (internal ? "#contact" : "https://"));
    setLabel(existing?.label || initialLabel || "");
    setOpenInNewTab(
      existing?.target ? existing.target === "_blank" : !internal
    );
    setError(null);
  }, [open, slot, existing, initialHref, initialLabel]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      let normalized = href.trim();
      if (mode === "internal") {
        if (!normalized.startsWith("#")) {
          normalized = `#${normalized.replace(/^#/, "")}`;
        }
      } else if (normalized && !/^https?:\/\//i.test(normalized)) {
        normalized = `https://${normalized}`;
      }

      const data = await safeFetchJSON<{
        link: ResolvedLink | null;
        needsReview?: boolean;
      }>("/api/website/link", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot,
          href: normalized,
          target:
            mode === "internal" ? "_self" : openInNewTab ? "_blank" : "_self",
          ...(isCta && label.trim() ? { label: label.trim() } : {}),
        }),
      });

      onUpdated(slot, data.link, data.needsReview);
      toast.success("Link updated");
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save link";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <StudioModal
      open={open}
      onClose={onClose}
      overlayClassName="z-[60]"
      title={
        <span className="flex items-center gap-2">
          <Link2 className="size-4 text-gold" />
          Edit link
        </span>
      }
      description={
        <span className="capitalize">{formatLinkSlotLabel(slot)}</span>
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => void save()}
            disabled={busy || !href.trim()}
          >
            {busy ? "Saving…" : "Save link"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-1 rounded-sm border border-[var(--border-solid)] p-1">
          {(
            [
              ["internal", "On this page"],
              ["external", "External URL"],
            ] as const
          ).map(([value, labelText]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                if (value === "internal") {
                  setOpenInNewTab(false);
                  if (!href.startsWith("#")) setHref("#contact");
                } else {
                  setOpenInNewTab(true);
                  if (href.startsWith("#")) setHref("https://");
                }
              }}
              className={cn(
                "flex-1 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
                mode === value
                  ? "bg-surface text-gold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {labelText}
            </button>
          ))}
        </div>

        <label className="block space-y-1.5">
          <span className="text-label">
            {mode === "internal" ? "Section" : "URL"}
          </span>
          <input
            type={mode === "external" ? "url" : "text"}
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder={
              mode === "internal" ? "#contact" : "https://example.com"
            }
            className="w-full rounded-sm border border-[var(--border-solid)] bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
          {mode === "internal" && (
            <span className="block text-card-meta">
              Use a page section id, e.g. #contact, #services, #work
            </span>
          )}
        </label>

        {isCta && (
          <label className="block space-y-1.5">
            <span className="text-label">Button label</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={80}
              className="w-full rounded-sm border border-[var(--border-solid)] bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </label>
        )}

        {mode === "external" && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={openInNewTab}
              onChange={(e) => setOpenInNewTab(e.target.checked)}
              className="size-4 accent-[var(--gold)]"
            />
            Open in a new tab
          </label>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </StudioModal>
  );
}
