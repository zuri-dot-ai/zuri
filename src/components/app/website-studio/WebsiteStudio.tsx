"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Briefcase,
  Building2,
  ChevronRight,
  Code2,
  Eye,
  ExternalLink,
  FileText,
  HelpCircle,
  ImageIcon,
  Info,
  Link2,
  Palette,
  Phone,
  Rocket,
  Settings,
  Share2,
  Sparkles,
  Star,
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
import type { LinkSlotsHealReason } from "@/lib/website/link-slots";
import { FetchError, safeFetchJSON } from "@/lib/utils/safe-fetch";
import { ContentPanel } from "./ContentPanel";
import { ImagesPanel } from "./ImagesPanel";
import { LinksPanel } from "./LinksPanel";
import { EmbedsPanel } from "./EmbedsPanel";
import { ThemePanel } from "./ThemePanel";
import { PublishPanel } from "./PublishPanel";
import { PreviewFrame } from "./PreviewFrame";
import { ImageSwapModal } from "./ImageSwapModal";
import { LinkEditorModal } from "./LinkEditorModal";
import { ReviewChecklist } from "./ReviewChecklist";
import { StudioModal } from "./StudioModal";
import { CustomDomainPanel } from "./CustomDomainPanel";
import { CustomSiteCTA } from "@/components/website/CustomSiteCTA";
import type {
  ActiveTheme,
  DesignArchetype,
  ResolvedEmbed,
  ResolvedImage,
  ResolvedLink,
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
  | "links"
  | "embeds"
  | "theme"
  | "publish"
  | "settings";

type LinkModalState = {
  slot: string;
  href?: string;
  label?: string;
};

const SECTION_ICONS: Record<string, React.ElementType> = {
  hero: Sparkles,
  about: Info,
  services: Briefcase,
  testimonials: Star,
  faq: HelpCircle,
  contact: Phone,
  social: Share2,
  business: Building2,
  other: FileText,
};

const PANEL_SIZE: Partial<Record<PanelId, "md" | "lg" | "xl">> = {
  images: "lg",
  embeds: "lg",
  publish: "lg",
  settings: "lg",
  services: "lg",
  faq: "lg",
};

export function WebsiteStudio({
  websiteId,
  filledPlaceholders: initialPlaceholders,
  filledImages: initialImages,
  filledLinks: initialLinks,
  filledEmbeds: initialEmbeds,
  imageSlots,
  linkSlots,
  linksHealFailed = false,
  linksHealReason,
  activeTheme: initialTheme,
  archetype,
  isPublished,
  slug,
  handle,
  plan,
  needsReview: initialNeedsReview,
  hasOpenCustomRequest = false,
}: {
  websiteId: string;
  filledPlaceholders: Record<string, string>;
  filledImages: Record<string, ResolvedImage>;
  filledLinks: Record<string, ResolvedLink>;
  filledEmbeds: ResolvedEmbed[];
  imageSlots: string[];
  linkSlots: string[];
  linksHealFailed?: boolean;
  linksHealReason?: LinkSlotsHealReason;
  activeTheme: ActiveTheme;
  archetype: DesignArchetype | null;
  isPublished: boolean;
  slug: string | null;
  handle: string | null;
  plan: string;
  needsReview: boolean;
  hasOpenCustomRequest?: boolean;
}) {
  const router = useRouter();
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);
  const [placeholders, setPlaceholders] = useState(initialPlaceholders);
  const [images, setImages] = useState(initialImages);
  const [links, setLinks] = useState(initialLinks);
  const [embeds, setEmbeds] = useState(initialEmbeds);
  const [activeTheme, setActiveTheme] = useState(initialTheme);
  const [needsReview, setNeedsReview] = useState(initialNeedsReview);
  const [published, setPublished] = useState(isPublished);
  const [liveSlug, setLiveSlug] = useState(slug);
  const [previewKey, setPreviewKey] = useState(0);
  const [portalReady, setPortalReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<"publish" | "unpublish" | null>(
    null
  );
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<{
    feature: string;
    benefit: string;
    requiredPlan: "Pro" | "Growth";
  }>({
    feature: "Publish website",
    benefit:
      "Pro unlocks a live subdomain — editing and preview stay free on all plans.",
    requiredPlan: "Pro",
  });
  const [reviewOpen, setReviewOpen] = useState(false);
  const [imageModalSlot, setImageModalSlot] = useState<string | null>(null);
  const [linkModal, setLinkModal] = useState<LinkModalState | null>(null);
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
    setPortalReady(true);
  }, []);

  useEffect(() => {
    const hasBrokenImages = Object.values(initialImages).some((img) =>
      isBrokenImageUrl(img.url)
    );
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

  function onLinkUpdated(
    slot: string,
    link: ResolvedLink | null,
    review?: boolean
  ) {
    setLinks((prev) => {
      const next = { ...prev };
      if (link) next[slot] = link;
      else delete next[slot];
      return next;
    });
    if (typeof review === "boolean") setNeedsReview(review);
    bumpPreview();
  }

  function onEmbedsUpdated(next: ResolvedEmbed[], review?: boolean) {
    setEmbeds(next);
    if (typeof review === "boolean") setNeedsReview(review);
    bumpPreview();
  }

  function onThemeChange(theme: ActiveTheme, review?: boolean) {
    setActiveTheme(theme);
    if (typeof review === "boolean") setNeedsReview(review);
    bumpPreview();
  }

  function onLinkSlotClick(slot: string, href: string, label: string) {
    setLinkModal({ slot, href, label });
  }

  function onFocusField(field: string) {
    const section = sectionForField(field);
    const sid = previewSectionId(section);
    if (sid) setHighlightSection(sid);
  }

  function openUpgrade(opts?: {
    feature?: string;
    benefit?: string;
    requiredPlan?: "Pro" | "Growth";
  }) {
    setUpgradeFeature({
      feature: opts?.feature ?? "Publish website",
      benefit:
        opts?.benefit ??
        "Pro unlocks a live subdomain — editing and preview stay free on all plans.",
      requiredPlan: opts?.requiredPlan ?? "Pro",
    });
    setUpgradeOpen(true);
  }

  function jumpToIssue(issue: ReviewIssue) {
    setReviewOpen(false);
    setActivePanel(issue.sectionId as PanelId);
    if (issue.kind === "image") {
      setImageModalSlot(issue.target);
    } else {
      setFocusFieldId(issue.target);
      const sid = previewSectionId(issue.sectionId);
      if (sid) setHighlightSection(sid);
    }
  }

  async function publish() {
    if (!canPublish) {
      openUpgrade();
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
        openUpgrade();
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
      openUpgrade();
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
        openUpgrade();
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
      { id: "links", label: "Links", icon: Link2 },
      { id: "embeds", label: "Embeds", icon: Code2 },
      { id: "theme", label: "Theme", icon: Palette },
      { id: "publish", label: "Publish", icon: Rocket },
      { id: "settings", label: "Domain", icon: Settings },
    ];

  function renderPanelBody(id: PanelId) {
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
    if (id === "links") {
      return (
        <LinksPanel
          linkSlots={linkSlots}
          filledLinks={links}
          healFailed={linksHealFailed}
          healReason={linksHealReason}
          onOpenSlot={(slot) =>
            setLinkModal({
              slot,
              href: links[slot]?.href,
              label: links[slot]?.label,
            })
          }
        />
      );
    }
    if (id === "embeds") {
      return <EmbedsPanel embeds={embeds} onChange={onEmbedsUpdated} />;
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
          onUpgrade={() => openUpgrade()}
        />
      );
    }
    if (id === "settings") {
      return (
        <CustomDomainPanel
          plan={plan}
          onUpgrade={() =>
            openUpgrade({
              feature: "Custom domain",
              benefit:
                "Growth unlocks your own domain so customers find you on your brand.",
              requiredPlan: "Growth",
            })
          }
        />
      );
    }
    return null;
  }

  function openPanel(id: PanelId) {
    setActivePanel(id);
  }

  function openFullScreenPreview() {
    if (!previewHandle) return;
    router.push(
      `/website-preview?handle=${encodeURIComponent(previewHandle)}&v=${previewKey}`
    );
  }

  const sidebarItems: { id: PanelId; label: string; icon: React.ElementType }[] =
    [
      ...contentGroups.map((g) => ({
        id: g.id as PanelId,
        label: g.label,
        icon: SECTION_ICONS[g.id] ?? FileText,
      })),
      ...staticPanels.map((p) => ({ id: p.id, label: p.label, icon: p.icon })),
    ];

  const activeLabel =
    sidebarItems.find((i) => i.id === activePanel)?.label ?? "Edit";

  function renderSectionButton(item: {
    id: PanelId;
    label: string;
    icon: React.ElementType;
  }) {
    const Icon = item.icon;
    const selected = activePanel === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => openPanel(item.id)}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium [transition-duration:var(--transition-fast)] transition-colors",
          selected
            ? "bg-surface text-gold"
            : "text-foreground hover:bg-surface/50"
        )}
      >
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col gap-4">
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
          <p className="text-card-body capitalize">
            {archetype?.replace(/-/g, " ") ?? "Custom template"} ·{" "}
            {activeTheme.replace("-", " ")}
          </p>
          {published && liveUrl ? (
            <p className="text-card-meta font-mono text-xs">
              {liveUrl.replace(/^https?:\/\//, "")}
            </p>
          ) : null}
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
              {busyAction === "unpublish" ? (
                <span className="zuri-spinner !size-3.5" />
              ) : (
                <Undo2 className="size-4" />
              )}
              {busyAction === "unpublish" ? "Unpublishing…" : "Unpublish"}
            </Button>
          ) : (
            <Button size="sm" onClick={publish} disabled={busy}>
              {busyAction === "publish" ? (
                <span className="zuri-spinner !size-3.5" />
              ) : (
                <Rocket className="size-4" />
              )}
              {busyAction === "publish"
                ? "Publishing…"
                : canPublish
                  ? "Publish"
                  : "Upgrade to publish"}
            </Button>
          )}
        </div>
      </header>

      <div className="hidden min-h-0 flex-1 gap-4 lg:grid lg:grid-cols-[minmax(280px,380px)_1fr]">
        <aside className="zuri-card flex max-h-[calc(100vh-10rem)] flex-col overflow-hidden p-0">
          <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-[var(--border-solid)]">
            {sidebarItems.map((item) => renderSectionButton(item))}
          </div>
          <div className="border-t border-[var(--border-solid)] p-4">
            <CustomSiteCTA
              context="editor"
              compact
              hasOpenRequest={hasOpenCustomRequest}
            />
          </div>
        </aside>

        <div className="min-h-[70vh]">
          <PreviewFrame
            handle={previewHandle}
            refreshKey={previewKey}
            rootDomain={rootDomain}
            highlightSection={highlightSection}
            onImageSlotClick={setImageModalSlot}
            onLinkSlotClick={onLinkSlotClick}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:hidden">
        <div className="space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openPanel(item.id)}
                className="content-card flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium"
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
          <div className="pt-3">
            <CustomSiteCTA
              context="editor"
              compact
              hasOpenRequest={hasOpenCustomRequest}
            />
          </div>

          {published && canPublish ? (
            <Button
              variant="outline"
              className="mt-4 w-full border-destructive/40 text-destructive"
              onClick={unpublish}
              disabled={busy}
            >
              {busyAction === "unpublish" ? (
                <span className="zuri-spinner !size-3.5" />
              ) : (
                <Undo2 className="size-4" />
              )}
              Unpublish
            </Button>
          ) : (
            <Button className="mt-4 w-full" onClick={publish} disabled={busy}>
              {busyAction === "publish" ? (
                <span className="zuri-spinner !size-3.5" />
              ) : (
                <Rocket className="size-4" />
              )}
              {canPublish ? "Publish" : "Upgrade"}
            </Button>
          )}
        </div>
      </div>

      {portalReady &&
        previewUrl &&
        createPortal(
          <button
            type="button"
            onClick={openFullScreenPreview}
            aria-label="Preview site"
            title="Preview site"
            className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex items-center gap-2 rounded-full border border-[var(--border-solid)] bg-[var(--bg-elevated)] px-4 py-3 text-sm font-medium text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-colors hover:text-gold lg:hidden"
          >
            <Eye className="size-[18px]" />
            Preview
          </button>,
          document.body
        )}

      <StudioModal
        open={activePanel !== null}
        onClose={() => {
          setActivePanel(null);
          setFocusFieldId(null);
        }}
        title={activeLabel}
        size={activePanel ? PANEL_SIZE[activePanel] ?? "md" : "md"}
      >
        {activePanel ? renderPanelBody(activePanel) : null}
      </StudioModal>

      <ImageSwapModal
        slot={imageModalSlot ?? ""}
        archetype={archetype}
        open={Boolean(imageModalSlot)}
        onClose={() => setImageModalSlot(null)}
        onUpdated={onImageUpdated}
      />

      <LinkEditorModal
        slot={linkModal?.slot ?? ""}
        initialHref={linkModal?.href}
        initialLabel={linkModal?.label}
        existing={linkModal ? links[linkModal.slot] ?? null : null}
        open={Boolean(linkModal)}
        onClose={() => setLinkModal(null)}
        onUpdated={onLinkUpdated}
      />

      <UpgradeSheet
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        feature={upgradeFeature.feature}
        benefit={upgradeFeature.benefit}
        requiredPlan={upgradeFeature.requiredPlan}
      />
    </div>
  );
}
