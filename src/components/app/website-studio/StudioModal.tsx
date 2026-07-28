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
            "fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4",
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
              "relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-[var(--border-solid)] bg-[var(--bg-elevated)] shadow-[0_24px_64px_rgba(0,0,0,0.45)] outline-none sm:rounded-xl",
              SIZE_CLASS[size],
              className
            )}
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
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
              <button
                type="button"
                onClick={onClose}
                className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              {children}
            </div>

            {footer ? (
              <div className="shrink-0 border-t border-[var(--border-solid)] px-4 py-3 sm:px-5">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
