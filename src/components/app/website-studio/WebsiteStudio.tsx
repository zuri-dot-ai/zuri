"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  Eye,
  ExternalLink,
  FileText,
  Globe,
  ImageIcon,
  Palette,
  Rocket,
  Settings,
  Undo2,
  X,
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
import { isBrokenImageUrl } from "@/lib/website/image-url";
import {
  buildReviewIssues,
  sectionForField,
  type ReviewIssue,
} from "@/lib/website/review-issues";
import {
  groupPlaceholderFields,
  previewSectionId,
} from "@/lib/website/field-groups";
import { FetchError, safeFetchJSON } from "@/lib/utils/safe-fetch";
import { ContentPanel } from "./ContentPanel";
import { ImagesPanel } from "./ImagesPanel";
import { ThemePanel } from "./ThemePanel";
import { PublishPanel } from "./PublishPanel";
import { PreviewFrame } from "./PreviewFrame";
import { ImageSwapModal } from "./ImageSwapModal";
import { ReviewChecklist } from "./ReviewChecklist";
import type {
  ActiveTheme,
  DesignArchetype,
  ResolvedImage,
} from "@/types/website";

type PanelId =
  | "hero"
  | "about"
  | "services"
  | "testimonials"
  | "faq"
  | "contact"
  | "social"
  | "business"
  | "other"
  | "images"
  | "theme"
  | "publish"
  | "settings";

type MobileScreen = "list" | "edit" | "preview";

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
  const [expanded, setExpanded] = useState<PanelId | "">("hero");
  const [mobileScreen, setMobileScreen] = useState<MobileScreen>("list");
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
  const [reviewOpen, setReviewOpen] = useState(false);
  const [imageModalSlot, setImageModalSlot] = useState<string | null>(null);
  const [highlightSection, setHighlightSection] = useState<string | null>(null);
  const [focusFieldId, setFocusFieldId] = useState<string | null>(null);

  const rootDomain = getRootDomain();
  const previewHandle = handle ?? liveSlug;
  const liveUrl = liveSlug ? getPublicSiteUrl(liveSlug) : null;
  const previewUrl = previewHandle ? `/preview/${previewHandle}` : null;
  const canPublish = plan !== "free";

  const contentGroups = useMemo(
    () =>
      groupPlaceholderFields(
        Object.keys(placeholders).filter((k) => k !== "active_theme")
      ),
    [placeholders]
  );

  const reviewIssues = useMemo(
    () => buildReviewIssues(placeholders, images, imageSlots),
    [placeholders, images, imageSlots]
  );

  const effectiveNeedsReview = needsReview || reviewIssues.length > 0;

  useEffect(() => {
    const hasBrokenImages = Object.values(initialImages).some((img) =>
      isBrokenImageUrl(img.url)
    );
    // Also refresh when needs_review is set — often means picsum left in
    // template_html even if filled_images already looks fine.
    if (!hasBrokenImages && !initialNeedsReview) return;
    safeFetchJSON<{
      filledImages?: Record<string, ResolvedImage>;
      needsReview?: boolean;
    }>("/api/website/refresh-images", { method: "POST" })
      .then((data) => {
        if (data.filledImages) {
          setImages(data.filledImages);
          setPreviewKey((k) => k + 1);
        }
        if (typeof data.needsReview === "boolean") {
          setNeedsReview(data.needsReview);
        }
      })
      .catch(() => {});
  }, [initialImages, initialNeedsReview]);

  function bumpPreview() {
    setPreviewKey((k) => k + 1);
  }

  function onFieldSaved(field: string, value: string) {
    setPlaceholders((p) => ({ ...p, [field]: value }));
    bumpPreview();
  }

  function onImageUpdated(
    slot: string,
    image: ResolvedImage,
    review?: boolean
  ) {
    setImages((prev) => ({ ...prev, [slot]: image }));
    if (typeof review === "boolean") setNeedsReview(review);
    bumpPreview();
  }

  function onThemeChange(theme: ActiveTheme, review?: boolean) {
    setActiveTheme(theme);
    if (typeof review === "boolean") setNeedsReview(review);
    bumpPreview();
  }

  function onFocusField(field: string) {
    const section = sectionForField(field);
    const sid = previewSectionId(section);
    if (sid) setHighlightSection(sid);
  }

  function jumpToIssue(issue: ReviewIssue) {
    setReviewOpen(false);
    setExpanded(issue.sectionId as PanelId);
    setMobileScreen("edit");
    if (issue.kind === "image") {
      setImageModalSlot(issue.target);
      setTimeout(() => {
        document.getElementById(`slot-${issue.target}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 50);
    } else {
      setFocusFieldId(issue.target);
      const sid = previewSectionId(issue.sectionId);
      if (sid) setHighlightSection(sid);
    }
  }

  async function publish() {
    if (!canPublish) {
      setUpgradeOpen(true);
      return;
    }
    setBusy(true);
    setBusyAction("publish");
    try {
      const data = await safeFetchJSON<{
        slug: string;
        liveUrl?: string;
      }>("/api/website/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId }),
      });
      setPublished(true);
      setLiveSlug(data.slug);
      setNeedsReview(false);
      const url =
        (data.liveUrl as string | undefined) ?? getPublicSiteUrl(data.slug);
      celebrateFirstPublish(url);
      toast.success(`Live at ${formatPublicSiteUrlLabel(data.slug)}`);
    } catch (e) {
      if (e instanceof FetchError && e.status === 403) {
        setUpgradeOpen(true);
        return;
      }
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
      await safeFetchJSON("/api/website/unpublish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId }),
      });
      setPublished(false);
      toast.success("Site unpublished — back in preview mode");
    } catch (e) {
      if (e instanceof FetchError && e.status === 403) {
        setUpgradeOpen(true);
        return;
      }
      toast.error(e instanceof Error ? e.message : "Unpublish failed");
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }

  const staticPanels: { id: PanelId; label: string; icon: React.ElementType }[] =
    [
      { id: "images", label: "Images", icon: ImageIcon },
      { id: "theme", label: "Theme", icon: Palette },
      { id: "publish", label: "Publish", icon: Rocket },
      { id: "settings", label: "Settings", icon: Settings },
    ];

  function renderPanelBody(id: PanelId | "") {
    if (!id) return null;
    if (contentGroups.some((g) => g.id === id)) {
      const group = contentGroups.find((g) => g.id === id)!;
      return (
        <ContentPanel
          filledPlaceholders={Object.fromEntries(
            group.fields.map((f) => [f, placeholders[f] ?? ""])
          )}
          onChange={onFieldSaved}
          onFocusField={onFocusField}
          onNeedsReview={setNeedsReview}
          focusFieldId={focusFieldId}
          singleGroupId={group.id}
        />
      );
    }
    if (id === "images") {
      return (
        <ImagesPanel
          filledImages={images}
          imageSlots={imageSlots}
          archetype={archetype}
          onOpenSlot={setImageModalSlot}
        />
      );
    }
    if (id === "theme") {
      return (
        <ThemePanel
          activeTheme={activeTheme}
          onThemeChange={(t, r) => onThemeChange(t, r)}
        />
      );
    }
    if (id === "publish") {
      return (
        <PublishPanel
          published={published}
          canPublish={canPublish}
          needsReview={effectiveNeedsReview}
          previewUrl={previewUrl}
          liveUrl={liveUrl}
          busy={busy}
          onPublish={publish}
          onUnpublish={unpublish}
          onUpgrade={() => setUpgradeOpen(true)}
        />
      );
    }
    if (id === "settings") {
      return (
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            Custom domains are available on Growth plans. Connect your own
            domain from billing when you upgrade.
          </p>
          <Button variant="outline" size="sm" asChild>
            <a href="/settings?tab=billing">View plans</a>
          </Button>
        </div>
      );
    }
    return null;
  }

  function openPanel(id: PanelId) {
    setExpanded(id);
    setMobileScreen("edit");
  }

  const sidebarItems: { id: PanelId; label: string }[] = [
    ...contentGroups.map((g) => ({ id: g.id as PanelId, label: g.label })),
    ...staticPanels.map((p) => ({ id: p.id, label: p.label })),
  ];

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col gap-4 page-enter">
      {/* Top bar */}
      <header className="page-head flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1>Your Website</h1>
            <Badge variant={published ? "success" : "muted"}>
              {published ? "Live" : "Draft"}
            </Badge>
            <div className="relative">
              <button
                type="button"
                onClick={() => setReviewOpen((o) => !o)}
                className="inline-flex"
              >
                {effectiveNeedsReview ? (
                  <Badge
                    variant="outline"
                    className="cursor-pointer border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                  >
                    Needs review ({reviewIssues.length})
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="cursor-pointer border-emerald-500/40 text-emerald-600"
                  >
                    Ready
                  </Badge>
                )}
              </button>
              <ReviewChecklist
                open={reviewOpen}
                issues={reviewIssues}
                onClose={() => setReviewOpen(false)}
                onJump={jumpToIssue}
              />
            </div>
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

      {/* Desktop split-pane */}
      <div className="hidden min-h-0 flex-1 gap-4 lg:grid lg:grid-cols-[minmax(280px,380px)_1fr]">
        <aside className="zuri-card flex max-h-[calc(100vh-10rem)] flex-col overflow-hidden p-0">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {sidebarItems.map((item) => {
              const open = expanded === item.id;
              return (
                <div key={item.id} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? "" : item.id)}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors",
                      open
                        ? "bg-surface text-gold"
                        : "text-foreground hover:bg-surface/50"
                    )}
                  >
                    {item.label}
                    <span className="text-xs text-muted-foreground">
                      {open ? "−" : "+"}
                    </span>
                  </button>
                  {open && (
                    <div className="border-t border-border px-4 py-4">
                      {renderPanelBody(item.id)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        <div className="min-h-[70vh]">
          <PreviewFrame
            handle={previewHandle}
            refreshKey={previewKey}
            rootDomain={rootDomain}
            highlightSection={highlightSection}
            onImageSlotClick={setImageModalSlot}
          />
        </div>
      </div>

      {/* Mobile: section list → editor → preview sheet */}
      <div className="flex flex-1 flex-col lg:hidden">
        {mobileScreen === "list" && (
          <div className="space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openPanel(item.id)}
                className="flex w-full items-center gap-3 rounded-sm border border-border px-4 py-3.5 text-left text-sm font-medium hover:border-gold/40"
              >
                <FileText className="size-4 text-muted-foreground" />
                {item.label}
              </button>
            ))}
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => setMobileScreen("preview")}
            >
              <Eye className="size-4" /> Preview site
            </Button>
          </div>
        )}

        {mobileScreen === "edit" && expanded && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setMobileScreen("list")}
              className="flex items-center gap-1 text-sm text-muted-foreground"
            >
              <ChevronLeft className="size-4" /> Sections
            </button>
            <h2 className="font-heading text-xl capitalize">
              {sidebarItems.find((i) => i.id === expanded)?.label}
            </h2>
            <div className="zuri-card">{renderPanelBody(expanded)}</div>
            <Button
              variant="outline"
              onClick={() => setMobileScreen("preview")}
            >
              <Eye className="size-4" /> Preview
            </Button>
          </div>
        )}

        {mobileScreen === "preview" && (
          <div className="fixed inset-0 z-40 flex flex-col bg-background">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-medium">Preview</p>
              <button
                type="button"
                onClick={() =>
                  setMobileScreen(expanded ? "edit" : "list")
                }
                className="rounded-sm p-1.5 hover:bg-surface"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <PreviewFrame
                handle={previewHandle}
                refreshKey={previewKey}
                rootDomain={rootDomain}
                highlightSection={highlightSection}
                onImageSlotClick={(slot) => {
                  setImageModalSlot(slot);
                  setExpanded("images");
                  setMobileScreen("edit");
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 flex gap-2 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
        {previewUrl && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setMobileScreen("preview")}
          >
            <Globe className="size-4" /> Preview
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

      {imageModalSlot && (
        <ImageSwapModal
          slot={imageModalSlot}
          archetype={archetype}
          open={Boolean(imageModalSlot)}
          onClose={() => setImageModalSlot(null)}
          onUpdated={onImageUpdated}
        />
      )}

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
