"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Briefcase,
  Building2,
  ChevronRight,
  Code2,
  Eye,
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
} from "lucide-react";
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

type SectionItem = {
  id: PanelId;
  label: string;
  icon: React.ElementType;
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

/** Left-panel content groups in display order. FAQ/Other only render when present. */
const LEFT_GROUP_ORDER = [
  "hero",
  "about",
  "services",
  "testimonials",
  "faq",
  "contact",
  "social",
  "business",
  "other",
] as const;

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
  templateId = null,
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
  templateId?: string | null;
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

  const leftPanelItems = useMemo((): SectionItem[] => {
    const byId = new Map(contentGroups.map((g) => [g.id, g]));
    return LEFT_GROUP_ORDER.filter((id) => byId.has(id)).map((id) => {
      const g = byId.get(id)!;
      return {
        id: g.id as PanelId,
        label: g.label,
        icon: SECTION_ICONS[g.id] ?? FileText,
      };
    });
  }, [contentGroups]);

  const rightPanelItems: SectionItem[] = [
    { id: "images", label: "Images", icon: ImageIcon },
    { id: "links", label: "Links", icon: Link2 },
    { id: "embeds", label: "Embeds", icon: Code2 },
    { id: "theme", label: "Theme", icon: Palette },
    { id: "publish", label: "Publish", icon: Rocket },
    { id: "settings", label: "Domain", icon: Settings },
  ];

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
          canSave={Boolean(templateId)}
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
          issues={reviewIssues}
          onPublish={publish}
          onUnpublish={unpublish}
          onUpgrade={() => openUpgrade()}
          onJump={jumpToIssue}
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

  const allPanelItems = [...leftPanelItems, ...rightPanelItems];
  const activeLabel =
    allPanelItems.find((i) => i.id === activePanel)?.label ?? "Edit";

  function renderSectionButton(item: SectionItem) {
    const Icon = item.icon;
    const selected = activePanel === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => openPanel(item.id)}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium [transition-duration:var(--transition-fast)] transition-colors",
          // At lg+, share panel height equally so rows fill down to the preview edge.
          "lg:min-h-0 lg:flex-1 lg:gap-3.5 lg:px-4 lg:py-0 lg:text-[0.9375rem]",
          selected
            ? "bg-surface text-gold"
            : "text-foreground hover:bg-surface/50"
        )}
      >
        <Icon className="size-4 shrink-0 text-muted-foreground lg:size-5" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground lg:size-5" />
      </button>
    );
  }

  function renderSidePanel(items: SectionItem[]) {
    return (
      <aside className="zuri-card flex flex-col divide-y divide-[var(--border-solid)] p-0 lg:h-full lg:min-h-0">
        {items.map((item) => renderSectionButton(item))}
      </aside>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col gap-4">
      <header className="page-head flex flex-row items-center justify-between gap-3">
        <h1>Your Website</h1>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {previewUrl ? (
            <Button variant="outline" size="sm" asChild>
              <a href={previewUrl} target="_blank" rel="noreferrer">
                <Eye className="size-4" /> Preview
              </a>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={openFullScreenPreview}
              disabled={!previewHandle}
            >
              <Eye className="size-4" /> Preview
            </Button>
          )}
          {published ? (
            <Button size="sm" onClick={() => openPanel("publish")} disabled={busy}>
              <Rocket className="size-4" />
              Publish
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

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:grid lg:min-h-[70vh] lg:grid-cols-[minmax(11rem,1fr)_minmax(0,3fr)_minmax(11rem,1fr)] lg:items-stretch">
        {renderSidePanel(leftPanelItems)}

        <div className="min-h-[50vh] lg:h-full lg:min-h-0">
          <PreviewFrame
            handle={previewHandle}
            refreshKey={previewKey}
            rootDomain={rootDomain}
            highlightSection={highlightSection}
            onImageSlotClick={setImageModalSlot}
            onLinkSlotClick={onLinkSlotClick}
          />
        </div>

        {renderSidePanel(rightPanelItems)}
      </div>

      <CustomSiteCTA
        context="editor"
        compact
        hasOpenRequest={hasOpenCustomRequest}
      />

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
