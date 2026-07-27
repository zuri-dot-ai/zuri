"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const KEY = "zuri_first_visit_tour_dismissed";
const MD_QUERY = "(min-width: 768px)";
const PAD = 8;
const TOOLTIP_GAP = 12;

type TourStep = {
  target: string;
  targetMobile?: string;
  title: string;
  titleMobile?: string;
  body: string;
  bodyMobile?: string;
  href?: string;
  hrefMobile?: string | null;
};

const STEPS: TourStep[] = [
  {
    target: "home",
    title: "Home",
    body: "Start here each day — one clear next step for your business.",
    href: "/dashboard",
  },
  {
    target: "website",
    title: "Website",
    body: "Preview your site, tweak copy, and publish when you're ready.",
    href: "/website",
  },
  {
    target: "content",
    title: "Content",
    body: "Your 90-day plan lives here — drafts ready to post.",
    href: "/content",
  },
  {
    target: "plan",
    title: "Plan",
    body: "Your 90-day business plan and tasks — stay on track week by week.",
    href: "/plan",
  },
  {
    target: "analytics",
    title: "Analytics",
    body: "See traffic, visitors, and how your site is performing.",
    href: "/analytics",
  },
  {
    target: "settings",
    targetMobile: "menu",
    title: "Settings",
    titleMobile: "Menu",
    body: "Manage your profile, billing, and brand voice anytime.",
    bodyMobile:
      "Tap the menu for Settings, Marketplace, Help, and more.",
    href: "/settings",
    hrefMobile: null,
  },
];

type Rect = { top: number; left: number; width: number; height: number };

function isVisible(el: Element): boolean {
  const html = el as HTMLElement;
  if (
    html.offsetParent === null &&
    getComputedStyle(html).position !== "fixed"
  ) {
    return false;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;
  const style = getComputedStyle(html);
  if (
    style.visibility === "hidden" ||
    style.display === "none" ||
    style.opacity === "0"
  ) {
    return false;
  }
  return true;
}

function findTarget(id: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`);
  for (const node of nodes) {
    if (isVisible(node)) return node;
  }
  return null;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function resolveStepMeta(step: TourStep, isDesktop: boolean) {
  const targetId =
    !isDesktop && step.targetMobile ? step.targetMobile : step.target;
  const title = !isDesktop && step.titleMobile ? step.titleMobile : step.title;
  const body = !isDesktop && step.bodyMobile ? step.bodyMobile : step.body;
  const href =
    !isDesktop && step.hrefMobile !== undefined ? step.hrefMobile : step.href;
  return { targetId, title, body, href };
}

function computeTooltipStyle(
  target: Rect,
  isDesktop: boolean,
  isMenuStep: boolean
): CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxW = isDesktop ? 320 : 260;
  const tipW = Math.min(maxW, vw - 24);
  const tipH = isDesktop ? 168 : 148;

  if (isDesktop) {
    let left = target.left + target.width + TOOLTIP_GAP;
    let top = target.top + target.height / 2 - tipH / 2;
    if (left + tipW > vw - 12) {
      left = target.left - tipW - TOOLTIP_GAP;
    }
    left = clamp(left, 12, vw - tipW - 12);
    top = clamp(top, 12, vh - tipH - 12);
    return { position: "fixed", left, top, width: tipW, maxWidth: tipW };
  }

  if (isMenuStep) {
    let left = target.left + target.width / 2 - tipW / 2;
    let top = target.top + target.height + TOOLTIP_GAP;
    left = clamp(left, 12, vw - tipW - 12);
    if (top + tipH > vh - 12) {
      top = target.top - tipH - TOOLTIP_GAP;
    }
    top = clamp(top, 12, vh - tipH - 12);
    return { position: "fixed", left, top, width: tipW, maxWidth: tipW };
  }

  let left = target.left + target.width / 2 - tipW / 2;
  let top = target.top - tipH - TOOLTIP_GAP;
  left = clamp(left, 12, vw - tipW - 12);
  if (top < 12) {
    top = target.top + target.height + TOOLTIP_GAP;
  }
  top = clamp(top, 12, vh - tipH - 12);
  return { position: "fixed", left, top, width: tipW, maxWidth: tipW };
}

/** One-time guided spotlight tour on first app visit */
export function FirstVisitTour() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties>({});

  const current = STEPS[step];
  const { targetId, title, body } = resolveStepMeta(current, isDesktop);
  const isMenuStep = targetId === "menu";

  const measure = useCallback(() => {
    const el = findTarget(targetId);
    if (!el) {
      setTargetRect(null);
      return;
    }
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    const r = el.getBoundingClientRect();
    const rect: Rect = {
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    };
    setTargetRect(rect);
    setTooltipStyle(computeTooltipStyle(rect, isDesktop, isMenuStep));
  }, [targetId, isDesktop, isMenuStep]);

  useEffect(() => {
    setMounted(true);
    try {
      if (localStorage.getItem(KEY)) return;
      setVisible(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(MD_QUERY);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useLayoutEffect(() => {
    if (!visible) return;
    measure();
    // Remeasure after route paint / layout settle
    const t1 = window.setTimeout(measure, 80);
    const t2 = window.setTimeout(measure, 250);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [visible, step, targetId, measure]);

  useEffect(() => {
    if (!visible) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [visible, measure]);

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  function next() {
    const nextIndex = step + 1;
    if (nextIndex >= STEPS.length) {
      dismiss();
      return;
    }
    const { href } = resolveStepMeta(STEPS[nextIndex], isDesktop);
    if (href) router.push(href);
    setStep(nextIndex);
  }

  if (!visible || !mounted) return null;

  const hole = targetRect;

  return createPortal(
    <div
      className="fixed inset-0 z-[90]"
      role="dialog"
      aria-modal
      aria-label="Quick tour"
    >
      {hole ? (
        <>
          {/* Four-pane dimmer — leaves the target clickable */}
          <button
            type="button"
            aria-label="Dismiss tour"
            className="fixed left-0 right-0 top-0 bg-black/55"
            style={{ height: Math.max(0, hole.top) }}
            onClick={dismiss}
          />
          <button
            type="button"
            aria-label="Dismiss tour"
            className="fixed left-0 bg-black/55"
            style={{
              top: hole.top,
              width: Math.max(0, hole.left),
              height: hole.height,
            }}
            onClick={dismiss}
          />
          <button
            type="button"
            aria-label="Dismiss tour"
            className="fixed right-0 bg-black/55"
            style={{
              top: hole.top,
              left: hole.left + hole.width,
              height: hole.height,
            }}
            onClick={dismiss}
          />
          <button
            type="button"
            aria-label="Dismiss tour"
            className="fixed bottom-0 left-0 right-0 bg-black/55"
            style={{ top: hole.top + hole.height }}
            onClick={dismiss}
          />
          <div
            className="pointer-events-none fixed rounded-[10px] ring-2 ring-gold shadow-[0_0_0_4px_rgba(201,162,39,0.25)]"
            style={{
              top: hole.top,
              left: hole.left,
              width: hole.width,
              height: hole.height,
            }}
          />
        </>
      ) : (
        <button
          type="button"
          aria-label="Dismiss tour"
          className="fixed inset-0 bg-black/55"
          onClick={dismiss}
        />
      )}

      <div
        className={cn(
          "z-[91] border border-gold/40 bg-background shadow-[var(--elevation-3)] page-enter",
          "p-3 max-w-[260px] md:p-5 md:max-w-sm"
        )}
        style={tooltipStyle}
      >
        <div className="flex items-start justify-between gap-2 md:gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gold md:text-xs">
              Quick tour · {step + 1}/{STEPS.length}
            </p>
            <h3 className="mt-1 font-heading text-base font-medium md:text-xl">
              {title}
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground md:mt-2 md:text-sm">
              {body}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss tour"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-2 md:mt-4">
          <Button size="sm" onClick={next}>
            {step >= STEPS.length - 1 ? "Done" : "Next"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
