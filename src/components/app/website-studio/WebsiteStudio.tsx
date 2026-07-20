"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Eye,
  ExternalLink,
  FileText,
  Globe,
  ImageIcon,
  Palette,
  Rocket,
  Settings,
  Undo2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UpgradeSheet } from "@/components/app/upgrade-sheet";
import { celebrateFirstPublish } from "@/lib/ui/milestones";
import {
  formatPublicSiteUrlLabel,
  getPublicSiteUrl,
  getRootDomain,
} from "@/lib/website/public-site-url";
import { ContentPanel } from "./ContentPanel";
import { ImagesPanel } from "./ImagesPanel";
import { ThemePanel } from "./ThemePanel";
import { PublishPanel } from "./PublishPanel";
import { PreviewFrame } from "./PreviewFrame";
import type {
  ActiveTheme,
  DesignArchetype,
  ResolvedImage,
} from "@/types/website";

type StudioTab = "content" | "images" | "theme" | "publish" | "settings";

const TABS: {
  id: StudioTab;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: "content", label: "Content", icon: FileText },
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "theme", label: "Theme", icon: Palette },
  { id: "publish", label: "Publish", icon: Rocket },
  { id: "settings", label: "Settings", icon: Settings },
];

export function WebsiteStudio({
  websiteId,
  filledPlaceholders: initialPlaceholders,
  filledImages: initialImages,
  imageSlots,
  activeTheme: initialTheme,
  archetype,
  isPublished,
  slug,
  handle,
  plan,
  needsReview: initialNeedsReview,
}: {
  websiteId: string;
  filledPlaceholders: Record<string, string>;
  filledImages: Record<string, ResolvedImage>;
  imageSlots: string[];
  activeTheme: ActiveTheme;
  archetype: DesignArchetype | null;
  isPublished: boolean;
  slug: string | null;
  handle: string | null;
  plan: string;
  needsReview: boolean;
}) {
  const [tab, setTab] = useState<StudioTab>("content");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [placeholders, setPlaceholders] = useState(initialPlaceholders);
  const [images, setImages] = useState(initialImages);
  const [activeTheme, setActiveTheme] = useState(initialTheme);
  const [needsReview, setNeedsReview] = useState(initialNeedsReview);
  const [published, setPublished] = useState(isPublished);
  const [liveSlug, setLiveSlug] = useState(slug);
  const [previewKey, setPreviewKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<"publish" | "unpublish" | null>(
    null
  );
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const rootDomain = getRootDomain();
  const previewHandle = handle ?? liveSlug;
  const liveUrl = liveSlug ? getPublicSiteUrl(liveSlug) : null;
  const previewUrl = previewHandle ? `/preview/${previewHandle}` : null;
  const canPublish = plan !== "free";

  useEffect(() => {
    const hasBroken = Object.values(initialImages).some((img) =>
      img.url.includes("/images/fallbacks/")
    );
    if (!hasBroken) return;
    fetch("/api/website/refresh-images", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.filledImages) {
          setImages(data.filledImages);
          setPreviewKey((k) => k + 1);
        }
      })
      .catch(() => {});
  }, [initialImages]);

  function bumpPreview() {
    setPreviewKey((k) => k + 1);
  }

  function onFieldSaved(field: string, value: string) {
    setPlaceholders((p) => ({ ...p, [field]: value }));
    bumpPreview();
  }

  function onImageUpdated(slot: string, image: ResolvedImage) {
    setImages((prev) => ({ ...prev, [slot]: image }));
    bumpPreview();
  }

  function onThemeChange(theme: ActiveTheme) {
    setActiveTheme(theme);
    bumpPreview();
  }

  async function publish() {
    if (!canPublish) {
      setUpgradeOpen(true);
      return;
    }
    setBusy(true);
    setBusyAction("publish");
    try {
      const res = await fetch("/api/website/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          setUpgradeOpen(true);
          return;
        }
        throw new Error(data.error);
      }
      setPublished(true);
      setLiveSlug(data.slug);
      setNeedsReview(false);
      const url = (data.liveUrl as string | undefined) ?? getPublicSiteUrl(data.slug);
      celebrateFirstPublish(url);
      toast.success(`Live at ${formatPublicSiteUrlLabel(data.slug)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }

  async function unpublish() {
    if (!canPublish) {
      setUpgradeOpen(true);
      return;
    }
    if (
      !window.confirm(
        "Take site offline? Visitors will get a 404 until you publish again."
      )
    ) {
      return;
    }
    setBusy(true);
    setBusyAction("unpublish");
    try {
      const res = await fetch("/api/website/unpublish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          setUpgradeOpen(true);
          return;
        }
        throw new Error(data.error);
      }
      setPublished(false);
      toast.success("Site unpublished — back in preview mode");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unpublish failed");
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col gap-5 page-enter">
      <header className="page-head flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1>Your Website</h1>
            <Badge variant={published ? "success" : "muted"}>
              {published ? "Live" : "Preview"}
            </Badge>
            {needsReview && (
              <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                Needs review
              </Badge>
            )}
            {plan === "free" && (
              <Badge variant="outline">Free — preview only</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground capitalize">
            {archetype?.replace(/-/g, " ") ?? "Custom template"} ·{" "}
            {activeTheme.replace("-", " ")}
          </p>
        </div>
        <div className="hidden flex-wrap gap-2 lg:flex">
          {previewUrl && !published && (
            <Button variant="outline" size="sm" asChild>
              <a href={previewUrl} target="_blank" rel="noreferrer">
                <Eye className="size-4" /> Preview
              </a>
            </Button>
          )}
          {liveUrl && published && (
            <Button variant="outline" size="sm" asChild>
              <a href={liveUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" /> Visit
              </a>
            </Button>
          )}
          {published && canPublish ? (
            <Button
              variant="outline"
              size="sm"
              onClick={unpublish}
              disabled={busy}
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              <Undo2 className="size-4" />
              {busyAction === "unpublish" ? "Unpublishing…" : "Unpublish"}
            </Button>
          ) : (
            <Button size="sm" onClick={publish} disabled={busy}>
              <Rocket className="size-4" />
              {busyAction === "publish"
                ? "Publishing…"
                : canPublish
                  ? "Publish"
                  : "Upgrade to publish"}
            </Button>
          )}
        </div>
      </header>

      <div className="flex gap-2 lg:hidden">
        {(["edit", "preview"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setMobileView(v)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-sm border py-2 text-sm capitalize",
              mobileView === v
                ? "border-gold bg-surface text-gold"
                : "border-border text-muted-foreground"
            )}
          >
            {v === "preview" ? (
              <Eye className="size-4" />
            ) : (
              <FileText className="size-4" />
            )}
            {v}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[220px_minmax(0,400px)_1fr]">
        <nav
          className={cn(
            "flex flex-col gap-1",
            mobileView !== "edit" && "hidden xl:flex"
          )}
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm font-medium transition-colors",
                tab === id
                  ? "bg-surface text-gold"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div
          className={cn(
            "zuri-card min-h-0 overflow-y-auto",
            mobileView !== "edit" && "hidden xl:block"
          )}
        >
          {tab === "content" && (
            <ContentPanel
              filledPlaceholders={placeholders}
              onChange={onFieldSaved}
            />
          )}
          {tab === "images" && (
            <ImagesPanel
              filledImages={images}
              imageSlots={imageSlots}
              archetype={archetype}
              onUpdated={onImageUpdated}
            />
          )}
          {tab === "theme" && (
            <ThemePanel
              activeTheme={activeTheme}
              onThemeChange={onThemeChange}
            />
          )}
          {tab === "publish" && (
            <PublishPanel
              published={published}
              canPublish={canPublish}
              needsReview={needsReview}
              previewUrl={previewUrl}
              liveUrl={liveUrl}
              busy={busy}
              onPublish={publish}
              onUnpublish={unpublish}
              onUpgrade={() => setUpgradeOpen(true)}
            />
          )}
          {tab === "settings" && (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Custom domains are available on Growth plans. Connect your own
                domain from billing when you upgrade.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="/settings?tab=billing">View plans</a>
              </Button>
            </div>
          )}
        </div>

        <div
          className={cn(
            "min-h-[60vh] xl:min-h-0",
            mobileView !== "preview" && "hidden xl:block"
          )}
        >
          <PreviewFrame
            handle={previewHandle}
            refreshKey={previewKey}
            rootDomain={rootDomain}
          />
        </div>
      </div>

      <div className="sticky bottom-0 flex gap-2 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
        {previewUrl && (
          <Button variant="outline" className="flex-1" asChild>
            <a href={previewUrl} target="_blank" rel="noreferrer">
              <Globe className="size-4" /> Preview
            </a>
          </Button>
        )}
        {published && canPublish ? (
          <Button
            variant="outline"
            className="flex-1 border-destructive/40 text-destructive"
            onClick={unpublish}
            disabled={busy}
          >
            <Undo2 className="size-4" />
            Unpublish
          </Button>
        ) : (
          <Button className="flex-1" onClick={publish} disabled={busy}>
            <Rocket className="size-4" />
            {canPublish ? "Publish" : "Upgrade"}
          </Button>
        )}
      </div>

      <UpgradeSheet
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        feature="Publish website"
        benefit="Pro unlocks a live subdomain — editing and preview stay free on all plans."
        requiredPlan="Pro"
      />
    </div>
  );
}
