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
  RefreshCw,
  Rocket,
  Settings,
  Share2,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-is-mobile";
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

/** website_regenerations caps per plan (src/lib/payments/plans.ts) —
 *  mirrored here only for display copy; the API route is the real gate. */
const REGENERATION_LIMIT_LABEL: Record<string, string> = {
  free: "not available on Free",
  pro: "2 per month",
  growth: "4 per month",
  premium: "7 per month",
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
  const isMobile = useIsMobile();
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
  const [busyAction, setBusyAction] = useState<
    "publish" | "unpublish" | "regenerate" | null
  >(null);
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
  const [regenRemaining, setRegenRemaining] = useState<number | null>(null);
  const [regenLimit, setRegenLimit] = useState<number | null>(null);
  const [regenChecked, setRegenChecked] = useState(false);

  const rootDomain = getRootDomain();
  const previewHandle = handle ?? liveSlug;
  const liveUrl = liveSlug ? getPublicSiteUrl(liveSlug) : null;
  const previewUrl = previewHandle ? `/preview/${previewHandle}` : null;
  const canPublish = plan !== "free";
  // Regenerate follows the same paid-plan gate as Publish — Free never has
  // a website_regenerations allotment (see src/lib/payments/plans.ts).
  const canRegenerate = plan !== "free";

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

  // Fetch remaining regeneration count once on mount (paid plans only —
  // Free is always locked, no need to hit the endpoint) so the button can
  // show "3 left" / "Limit reached" without waiting for a click.
  useEffect(() => {
    if (!canRegenerate) {
      setRegenChecked(true);
      return;
    }
    safeFetchJSON<{
      used: number;
      limit: number | null;
      remaining: number | null;
    }>("/api/website/regenerate", { method: "GET" })
      .then((data) => {
        setRegenLimit(data.limit);
        setRegenRemaining(data.remaining);
      })
      .catch(() => {})
      .finally(() => setRegenChecked(true));
  }, [canRegenerate]);

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

  async function regenerate() {
    if (!canRegenerate) {
      openUpgrade({
        feature: "Regenerate website",
        benefit:
          "Pro and above let you regenerate your whole site with a fresh template, layout, and copy whenever you want a new direction.",
        requiredPlan: "Pro",
      });
      return;
    }
    if (regenRemaining === 0) {
      openUpgrade({
        feature: "Regenerate website",
        benefit:
          "You've used all your regenerations this month — upgrade for a higher monthly allowance.",
        requiredPlan: plan === "pro" ? "Growth" : "Pro",
      });
      return;
    }
    if (
      !window.confirm(
        "Regenerate your website? This replaces your current template, layout, copy, and images with a brand new AI-generated version. Your link and embed customizations will be cleared. This can't be undone."
      )
    ) {
      return;
    }
    setBusy(true);
    setBusyAction("regenerate");
    try {
      const data = await safeFetchJSON<{
        handle: string;
        needsReview: boolean;
        remaining: number | null;
      }>("/api/website/regenerate", { method: "POST" });
      setNeedsReview(data.needsReview);
      setLinks({});
      setEmbeds([]);
      setRegenRemaining(data.remaining);
      bumpPreview();
      router.refresh();
      toast.success("Your website has been regenerated — take a look!");
    } catch (e) {
      if (e instanceof FetchError && e.status === 403) {
        // FetchError only exposes raw bodyText (see safe-fetch.ts) — parse
        // it ourselves to recover the `limit` field the regenerate route
        // sends on 403 (see src/app/api/website/regenerate/route.ts).
        // Falls back to the generic message if parsing fails for any
        // reason (non-JSON body, unexpected shape, etc.).
        let limit: number | undefined;
        try {
          const parsed = JSON.parse(e.bodyText) as { limit?: number };
          limit = parsed.limit;
        } catch {
          /* not JSON — use generic fallback message below */
        }
        openUpgrade({
          feature: "Regenerate website",
          benefit:
            limit === 0
              ? "Regenerating your website requires a paid plan."
              : "You've used all your regenerations this month — upgrade for a higher monthly allowance.",
          requiredPlan: plan === "pro" ? "Growth" : "Pro",
        });
        return;
      }
      toast.error(e instanceof Error ? e.message : "Regeneration failed");
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

  // Content-field panels (Hero/About/Testimonials/etc.) autosave each
  // field individually on blur — there's no single "Save" action to pin.
  // A sticky "Done" footer gives the same premium closing affordance
  // without implying a save that's already happened. Images/Links/Embeds/
  // Theme/Publish/Domain panels are excluded since they already have
  // their own in-panel actions.
  const isContentFieldPanel = activePanel
    ? contentGroups.some((g) => g.id === activePanel)
    : false;

  // Regenerate button label: locked (Free), out-of-credits, remaining
  // count once known, or a neutral label while the check is in flight.
  const regenerateLabel = (() => {
    if (busyAction === "regenerate") return "Regenerating…";
    if (!canRegenerate) return "Upgrade to regenerate";
    if (!regenChecked) return "Regenerate";
    if (regenRemaining === 0) return "Limit reached";
    if (regenRemaining != null) return `Regenerate (${regenRemaining} left)`;
    return "Regenerate";
  })();

  // Premium section-button treatment: icon sits in a small rounded badge
  // that lights up gold on selection, paired with a matching gold
  // left-border accent — one consistent "active" signal reused in both
  // places rather than two competing ones.
  function renderSectionButton(item: SectionItem) {
    const Icon = item.icon;
    const selected = activePanel === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => openPanel(item.id)}
        className={cn(
          "group flex w-full items-center gap-3 border-l-2 px-3 py-3 text-left text-sm font-medium [transition-duration:var(--transition-fast)] transition-colors active:scale-[0.98]",
          // At lg+, share panel height equally so rows fill down to the preview edge.
          "lg:min-h-0 lg:flex-1 lg:gap-3.5 lg:px-4 lg:py-0 lg:text-[0.9375rem]",
          selected
            ? "border-gold bg-gold/[0.06] text-gold"
            : "border-transparent text-foreground hover:bg-surface/50"
        )}
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md [transition-duration:var(--transition-fast)] transition-colors lg:size-9",
            selected
              ? "bg-gold/15 text-gold"
              : "bg-[var(--bg-secondary)] text-muted-foreground group-hover:text-foreground"
          )}
        >
          <Icon className="size-4 lg:size-[1.125rem]" />
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground lg:size-5" />
      </button>
    );
  }

  // groupLabel renders as a small gold uppercase kicker — visible only
  // below lg, since at lg+ the two lists are already spatially separated
  // by the preview column and don't need a label to disambiguate them.
  function renderSidePanel(items: SectionItem[], groupLabel: string) {
    return (
      <aside className="zuri-card flex flex-col p-0 lg:h-full lg:min-h-0">
        <p className="px-4 pb-1.5 pt-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold/80 lg:hidden">
          {groupLabel}
        </p>
        <div className="flex flex-col divide-y divide-[var(--border-solid)] lg:h-full lg:min-h-0">
          {items.map((item) => renderSectionButton(item))}
        </div>
      </aside>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col gap-4">
      <header className="page-head flex flex-row items-center justify-between gap-3">
        <h1>Your Website</h1>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isMobile ? (
            // Mobile: always open the in-app full-screen preview route —
            // never a new browser tab, since that's a jarring context
            // switch on a phone.
            <Button
              variant="outline"
              size="sm"
              className="active:scale-[0.96]"
              onClick={openFullScreenPreview}
              disabled={!previewHandle}
            >
              <Eye className="size-4" /> Preview
            </Button>
          ) : previewUrl ? (
            <Button variant="outline" size="sm" className="active:scale-[0.96]" asChild>
              <a href={previewUrl} target="_blank" rel="noreferrer">
                <Eye className="size-4" /> Preview
              </a>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="active:scale-[0.96]"
              onClick={openFullScreenPreview}
              disabled={!previewHandle}
            >
              <Eye className="size-4" /> Preview
            </Button>
          )}

          {/* Regenerate — same visible-but-locked pattern as Publish for
              Free-tier users. Disabled (not hidden) once a paid user hits
              their monthly cap, so the "N left" state is always visible
              rather than surprising. */}
          <Button
            variant="outline"
            size="sm"
            className="active:scale-[0.96]"
            onClick={regenerate}
            disabled={busy || (canRegenerate && regenRemaining === 0)}
            title={
              canRegenerate
                ? REGENERATION_LIMIT_LABEL[plan] ?? undefined
                : "Upgrade to Pro or higher to regenerate your website"
            }
          >
            {busyAction === "regenerate" ? (
              <span className="zuri-spinner !size-3.5" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {regenerateLabel}
          </Button>

          {published ? (
            <Button
              size="sm"
              className="active:scale-[0.96]"
              onClick={() => openPanel("publish")}
              disabled={busy}
            >
              <Rocket className="size-4" />
              Publish
            </Button>
          ) : (
            <Button size="sm" className="active:scale-[0.96]" onClick={publish} disabled={busy}>
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
        {renderSidePanel(leftPanelItems, "Content")}

        {/* Preview is desktop-only in the main scroll. On mobile/tablet it's
            reached via the header's Preview button (full-screen in-app
            route) instead of taking up vertical space between the two
            editing panels. */}
        <div className="hidden lg:block lg:h-full lg:min-h-0">
          <PreviewFrame
            handle={previewHandle}
            refreshKey={previewKey}
            rootDomain={rootDomain}
            highlightSection={highlightSection}
            onImageSlotClick={setImageModalSlot}
            onLinkSlotClick={onLinkSlotClick}
          />
        </div>

        {renderSidePanel(rightPanelItems, "Design & Publish")}
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
        footer={
          isContentFieldPanel ? (
            <Button
              className="w-full active:scale-[0.98]"
              onClick={() => {
                setActivePanel(null);
                setFocusFieldId(null);
              }}
            >
              Done
            </Button>
          ) : undefined
        }
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