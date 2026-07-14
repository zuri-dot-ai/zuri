"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Globe, ExternalLink, Loader2, Eye, Pencil, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BlockRenderer } from "@/components/website-blocks/BlockRenderer";
import { cn } from "@/lib/utils";
import type { WebsiteComposition } from "@/types/website";

export function WebsiteEditor({
  websiteId,
  composition,
  isPublished,
  slug,
  plan,
}: {
  websiteId: string;
  composition: WebsiteComposition;
  isPublished: boolean;
  slug: string | null;
  plan: string;
}) {
  const [published, setPublished] = useState(isPublished);
  const [liveSlug, setLiveSlug] = useState(slug);
  const [busy, setBusy] = useState(false);
  const [mobileTab, setMobileTab] = useState<"preview" | "edit">("preview");

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
  const liveUrl = liveSlug ? `https://${liveSlug}.${rootDomain}` : null;

  async function publish() {
    if (plan === "free") {
      toast.error("Upgrade to publish your website live.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/website/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPublished(true);
      setLiveSlug(data.slug);
      toast.success("Your website is live! 🚀");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-3xl font-semibold">Your Website</h1>
          <Badge variant={published ? "success" : "muted"}>
            {published ? "Live" : "Draft"}
          </Badge>
        </div>
        <div className="flex gap-3">
          {liveUrl && published && (
            <Button variant="outline" asChild>
              <a href={liveUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" /> Visit site
              </a>
            </Button>
          )}
          <Button onClick={publish} disabled={busy || published}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
            {published ? "Published" : "Publish"}
          </Button>
        </div>
      </div>

      {/* Mobile tab switch */}
      <div className="flex gap-2 md:hidden">
        {(["preview", "edit"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setMobileTab(t)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm capitalize",
              mobileTab === t ? "border-gold bg-surface text-gold" : "border-border text-muted-foreground"
            )}
          >
            {t === "preview" ? <Eye className="size-4" /> : <Pencil className="size-4" />}
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-[280px_1fr]">
        {/* Controls panel */}
        <div className={cn("space-y-4", mobileTab !== "edit" && "hidden md:block")}>
          <div className="zuri-card">
            <p className="mb-3 text-sm font-medium">Sections</p>
            <div className="space-y-1.5">
              {composition.sections.map((s, i) => (
                <div key={`${s}-${i}`} className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  {s.replace(/_/g, " ")}
                </div>
              ))}
            </div>
          </div>

          <div className="zuri-card">
            <p className="mb-3 text-sm font-medium">Palette</p>
            <div className="flex gap-2">
              {Object.entries(composition.palette).map(([k, v]) => (
                <div key={k} className="flex flex-col items-center gap-1">
                  <div className="size-9 rounded-lg border border-border" style={{ background: v }} />
                  <span className="text-[10px] text-muted-foreground">{k}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="zuri-card">
            <p className="text-sm font-medium">Motion style</p>
            <p className="mt-1 text-xs capitalize text-gold">
              {composition.motion_style.replace("_", " ")}
            </p>
          </div>
        </div>

        {/* Live preview */}
        <div className={cn("overflow-hidden rounded-xl border border-border", mobileTab !== "preview" && "hidden md:block")}>
          <div className="flex items-center gap-2 border-b border-border bg-background px-4 py-2.5">
            <Globe className="size-4 text-muted-foreground" />
            <span className="font-mono text-xs text-muted-foreground">
              {liveSlug ? `${liveSlug}.zuri.app` : "preview"}
            </span>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            <BlockRenderer composition={composition} />
          </div>
        </div>
      </div>
    </div>
  );
}