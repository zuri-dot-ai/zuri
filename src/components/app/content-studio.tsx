"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PenLine, Copy, Palette, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/app/empty-state";
import { PLATFORMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ContentCalendarRow, Platform } from "@/types/database";

const FILTERS = ["all", "instagram", "linkedin", "facebook", "tiktok", "email"] as const;

export function ContentStudio({
  initialSlots,
  plan,
}: {
  initialSlots: ContentCalendarRow[];
  plan: string;
}) {
  const [slots, setSlots] = useState(initialSlots);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [active, setActive] = useState<ContentCalendarRow | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const filtered = filter === "all" ? slots : slots.filter((s) => s.platform === filter);

  function platformMeta(p: Platform) {
    return PLATFORMS.find((x) => x.id === p);
  }

  async function regenerate(slot: ContentCalendarRow) {
    setRegenerating(true);
    try {
      const res = await fetch("/api/ai/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: slot.platform,
          postType: slot.post_type ?? "educational",
          theme: slot.theme ?? "",
          dayNumber: 1,
          slotId: slot.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const updated = {
        ...slot,
        ai_draft: data.draft.caption,
        hashtags: data.draft.hashtags,
        canva_url: data.canva_url,
        status: "drafted" as const,
      };
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? updated : s)));
      setActive(updated);
      toast.success("Writing a fresh draft… done");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not regenerate");
    } finally {
      setRegenerating(false);
    }
  }

  function copyDraft(slot: ContentCalendarRow) {
    const text = `${slot.ai_draft}\n\n${(slot.hashtags ?? []).map((h) => `#${h}`).join(" ")}`;
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  if (slots.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <header className="page-head">
          <h1>Content Studio</h1>
        </header>
        <EmptyState
          variant="content"
          icon={PenLine}
          title="Your content calendar is empty"
          description={
            plan === "free"
              ? "Free includes a taste of your strategy. Complete onboarding or upgrade to Pro for the full 90-day calendar."
              : "Your AI content drafts will appear here once your plan is generated. Check Plan if generation is still running."
          }
          actionLabel={plan === "free" ? "View billing" : "View your plan"}
          actionHref={plan === "free" ? "/settings?tab=billing" : "/plan"}
          actionVariant="secondary"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="page-head">
        <h1>Content Studio</h1>
      </header>

      {/* Platform filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-sm border px-4 py-1.5 text-sm capitalize transition-all",
              filter === f
                ? "border-gold bg-gold text-[var(--accent-foreground)]"
                : "border-border text-muted-foreground hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)]"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Slot grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((slot) => {
          const meta = platformMeta(slot.platform);
          return (
            <button
              key={slot.id}
              onClick={() => setActive(slot)}
              className="zuri-card text-left transition-colors hover:border-gold/40"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">{meta?.emoji} {meta?.label}</span>
                <Badge variant={slot.status === "drafted" ? "default" : "muted"}>
                  {slot.status}
                </Badge>
              </div>
              {slot.post_type && (
                <Badge variant="outline" className="mt-2 capitalize">
                  {slot.post_type.replace("_", " ")}
                </Badge>
              )}
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                {slot.ai_draft || slot.brief || "Tap to generate a draft"}
              </p>
              <p className="mt-3 font-mono text-xs text-muted-foreground">
                {new Date(slot.slot_date).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
              </p>
            </button>
          );
        })}
      </div>

      {/* Slide-over drawer */}
      {active && (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/80" onClick={() => setActive(null)}>
          <div
            className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <Badge>{platformMeta(active.platform)?.emoji} {platformMeta(active.platform)?.label}</Badge>
              <button onClick={() => setActive(null)} className="rounded-sm p-1.5 text-muted-foreground hover:bg-muted">
                <X className="size-5" />
              </button>
            </div>

            <h2 className="mt-4 font-heading text-2xl font-semibold capitalize">
              {active.post_type?.replace("_", " ") ?? "Post"}
            </h2>
            {active.theme && <p className="mt-1 text-sm text-muted-foreground">{active.theme}</p>}

            <div className="mt-5 rounded-sm border border-border bg-background p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {active.ai_draft || "No draft yet — regenerate to create one."}
              </p>
              {active.hashtags && active.hashtags.length > 0 && (
                <p className="mt-3 text-sm text-gold">
                  {active.hashtags.map((h) => `#${h}`).join(" ")}
                </p>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => copyDraft(active)}>
                <Copy className="size-4" /> Copy
              </Button>
              {active.canva_url && (
                <Button variant="outline" asChild>
                  <a href={active.canva_url} target="_blank" rel="noreferrer">
                    <Palette className="size-4" /> Canva
                  </a>
                </Button>
              )}
            </div>

            <Button className="mt-3 w-full" onClick={() => regenerate(active)} disabled={regenerating}>
              {regenerating ? <span className="zuri-spinner" /> : <RefreshCw className="size-4" />}
              Regenerate draft
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
