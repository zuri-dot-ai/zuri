// src/components/app/website-studio/StudioModal.tsx

"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type StudioModalSize = "md" | "lg" | "xl";

const SIZE_CLASS: Record<StudioModalSize, string> = {
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

/** Nested studio modals share one body scroll lock + Escape stack. */
let scrollLockCount = 0;
let escapeStack: Array<() => void> = [];

function lockBodyScroll() {
  if (scrollLockCount === 0) {
    document.body.style.overflow = "hidden";
  }
  scrollLockCount += 1;
}

function unlockBodyScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = "";
  }
}

function pushEscapeHandler(fn: () => void) {
  escapeStack.push(fn);
}

function popEscapeHandler(fn: () => void) {
  escapeStack = escapeStack.filter((h) => h !== fn);
}

function onGlobalEscape(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  const top = escapeStack[escapeStack.length - 1];
  if (top) {
    e.preventDefault();
    top();
  }
}

let escapeListenerAttached = false;
function ensureEscapeListener() {
  if (escapeListenerAttached) return;
  document.addEventListener("keydown", onGlobalEscape);
  escapeListenerAttached = true;
}

/**
 * Shared Website Studio editor shell — bottom sheet on mobile, centered
 * panel on desktop, with enter/exit motion.
 */
export function StudioModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
  overlayClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: StudioModalSize;
  className?: string;
  /** Extra classes on the fixed root (e.g. z-[60] for nested editors). */
  overlayClassName?: string;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const handler = () => onCloseRef.current();
    ensureEscapeListener();
    pushEscapeHandler(handler);
    lockBodyScroll();
    requestAnimationFrame(() => {
      panelRef.current?.focus({ preventScroll: true });
    });
    return () => {
      popEscapeHandler(handler);
      unlockBodyScroll();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className={cn(
            // z-[55], not z-50: BottomTabs is also z-50 and is declared
            // later in the DOM (after <main> in the app layout), so at
            // equal z-index it was winning the stacking fight and
            // painting over this modal. Nested editors (ImageSwapModal /
            // LinkEditorModal) still layer above this at z-[60] via
            // overlayClassName, and UpgradeSheet stays above everything
            // at z-[100].
            "fixed inset-0 z-[55] flex items-end justify-center sm:items-center sm:p-4",
            overlayClassName
          )}
          role="presentation"
        >
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cn(
              // `dvh` (dynamic viewport height) instead of `vh` — mobile
              // browsers report `vh` as the height *including* the space
              // under the address bar / bottom chrome, which isn't
              // actually visible. `dvh` updates live as that chrome
              // shows/hides, so the sheet never renders taller than
              // what's really on-screen.
              //
              // On mobile we additionally reserve space for the app's
              // fixed BottomTabs bar: ~3.625rem for its own content
              // (py-2.5 + size-5 icon + gap-1 + label text), PLUS
              // env(safe-area-inset-bottom) since BottomTabs pads itself
              // for the iPhone home-indicator strip on top of that. Both
              // terms are needed — omitting the safe-area term left the
              // sheet slightly too tall on notched phones.
              "relative z-10 flex max-h-[calc(92dvh-3.625rem-env(safe-area-inset-bottom))] w-full flex-col overflow-hidden rounded-t-2xl border border-[var(--border-solid)] bg-[var(--bg-elevated)] shadow-[0_24px_64px_rgba(0,0,0,0.45)] outline-none sm:max-h-[92dvh] sm:rounded-xl",
              SIZE_CLASS[size],
              className
            )}
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            {/* Drag handle — mobile bottom-sheet only. Purely visual (no
                swipe-to-dismiss gesture wired up here); signals "this is a
                sheet" the way native iOS/Android sheets do. */}
            <div className="flex shrink-0 justify-center pt-2.5 pb-1 sm:hidden">
              <div className="h-1 w-9 rounded-full bg-[var(--border-solid)]" />
            </div>

            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border-solid)] px-4 py-3.5 sm:px-5">
              <div className="min-w-0 space-y-0.5">
                <h2
                  id={titleId}
                  className="font-heading text-lg leading-tight text-foreground"
                >
                  {title}
                </h2>
                {description ? (
                  <div className="text-card-meta">{description}</div>
                ) : null}
              </div>
              <motion.button
                type="button"
                onClick={onClose}
                whileTap={{ scale: 0.9 }}
                className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-4" />
              </motion.button>
            </div>

            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
              style={
                footer
                  ? undefined
                  : { paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }
              }
            >
              {children}
            </div>

            {footer ? (
              <div
                className="shrink-0 border-t border-[var(--border-solid)] bg-[var(--bg-elevated)] px-4 py-3 sm:px-5"
                style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
              >
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
