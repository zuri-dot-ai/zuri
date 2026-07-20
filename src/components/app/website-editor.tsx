"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Globe, ExternalLink, Eye, Pencil, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FetchError, safeFetchJSON } from "@/lib/utils/safe-fetch";
import { UpgradeSheet } from "@/components/app/upgrade-sheet";
import { celebrateFirstPublish } from "@/lib/ui/milestones";
import type { ActiveTheme, DesignArchetype } from "@/types/website";

export function WebsiteEditor({
  websiteId,
  templateHtml,
  filledPlaceholders,
  activeTheme,
  archetype,
  isPublished,
  slug,
  plan,
}: {
  websiteId: string;
  templateHtml: string;
  filledPlaceholders: Record<string, string>;
  activeTheme: ActiveTheme;
  archetype: DesignArchetype | null;
  isPublished: boolean;
  slug: string | null;
  plan: string;
}) {
  const [published, setPublished] = useState(isPublished);
  const [liveSlug, setLiveSlug] = useState(slug);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Publishing…");
  const [mobileTab, setMobileTab] = useState<"preview" | "edit">("preview");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
  const liveUrl = liveSlug ? `https://${liveSlug}.${rootDomain}` : null;
  const previewUrl = liveSlug ? `/preview/${liveSlug}` : null;
  const placeholderEntries = Object.entries(filledPlaceholders).slice(0, 12);
  const canPublish = plan !== "free";

  async function publish() {
    if (!canPublish) {
      setUpgradeOpen(true);
      return;
    }
    setBusy(true);
    setBusyLabel("Publishing your site…");
    try {
      const data = await safeFetchJSON<{ slug?: string }>(
        "/api/website/publish",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ websiteId }),
        }
      );
      setPublished(true);
      setLiveSlug(data.slug ?? null);
      celebrateFirstPublish(
        data.slug ? `https://${data.slug}.${rootDomain}` : undefined
      );
    } catch (e) {
      if (e instanceof FetchError && e.status === 403) {
        setUpgradeOpen(true);
        return;
      }
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 page-enter">
      <header className="page-head flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1>Your Website</h1>
          <Badge variant={published ? "success" : "muted"}>
            {published ? "Live" : "Preview"}
          </Badge>
          {plan === "free" && (
            <Badge variant="outline">Free — preview only</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {previewUrl && !published && (
            <Button variant="outline" asChild>
              <a href={previewUrl} target="_blank" rel="noreferrer">
                <Eye className="size-4" /> Open preview
              </a>
            </Button>
          )}
          {liveUrl && published && (
            <Button variant="outline" asChild>
              <a href={liveUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" /> Visit site
              </a>
            </Button>
          )}
          <Button onClick={publish} disabled={busy || published}>
            {busy ? (
              <>
                <span className="zuri-spinner" />
                <span className="ml-1 text-xs">{busyLabel}</span>
              </>
            ) : (
              <Rocket className="size-4" />
            )}
            {published ? "Published" : canPublish ? "Publish" : "Upgrade to publish"}
          </Button>
        </div>
      </header>

      <div className="flex gap-2 md:hidden">
        {(["preview", "edit"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setMobileTab(t)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-sm border py-2 text-sm capitalize",
              mobileTab === t
                ? "border-gold bg-surface text-gold"
                : "border-border text-muted-foreground"
            )}
          >
            {t === "preview" ? (
              <Eye className="size-4" />
            ) : (
              <Pencil className="size-4" />
            )}
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-[280px_1fr]">
        <div
          className={cn("space-y-4", mobileTab !== "edit" && "hidden md:block")}
        >
          <div className="zuri-card">
            <p className="mb-3 text-sm font-medium">Template</p>
            <p className="text-xs capitalize text-gold">
              {archetype?.replace(/-/g, " ") ?? "Custom"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Theme: {activeTheme.replace("-", " ")}
            </p>
          </div>

          <div className="zuri-card">
            <p className="mb-3 text-sm font-medium">Content fields</p>
            <div className="space-y-1.5">
              {placeholderEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Placeholder edits will appear here once your site is
                  generated.
                </p>
              ) : (
                placeholderEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-sm border border-border bg-background px-3 py-2"
                  >
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {key.replace(/_/g, " ")}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-foreground">
                      {value}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div
          className={cn(
            "surface-hairline overflow-hidden border border-border reveal-preview",
            mobileTab !== "preview" && "hidden md:block"
          )}
        >
          <div className="flex items-center gap-2 border-b border-border bg-background px-4 py-2.5">
            <Globe className="size-4 text-muted-foreground" />
            <span className="font-mono text-xs text-muted-foreground">
              {liveSlug ? `${liveSlug}.${rootDomain}` : "preview"}
            </span>
          </div>
          <iframe
            title="Website preview"
            srcDoc={templateHtml}
            className="h-[70vh] w-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </div>

      <UpgradeSheet
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        feature="Publish website"
        benefit="Pro unlocks a live subdomain so customers can find you — editing and preview stay free."
        requiredPlan="Pro"
      />
    </div>
  );
}
