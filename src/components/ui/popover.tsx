"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type PopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  /** Preferred side relative to trigger */
  side?: "right" | "bottom";
  className?: string;
  contentClassName?: string;
  label?: string;
};

/**
 * Portal popover — escapes overflow:hidden parents.
 * Solid elevated panel + caret; closes on outside click and Escape.
 */
export function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  side = "right",
  className,
  contentClassName,
  label = "Popover",
}: PopoverProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    const panel = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 10;
    const panelW = 340;
    const panelH = panel?.offsetHeight ?? 320;

    if (side === "right") {
      let top = rect.top;
      if (top + panelH > window.innerHeight - 12) {
        top = Math.max(12, window.innerHeight - panelH - 12);
      }
      setCoords({
        top,
        left: Math.min(rect.right + gap, window.innerWidth - panelW - 12),
      });
    } else {
      setCoords({
        top: rect.bottom + gap,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - panelW - 12)),
      });
    }
  }, [side]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    // Re-measure after paint when panel has height
    const id = requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      onOpenChange(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open, onOpenChange]);

  return (
    <div className={cn("relative", className)} ref={triggerRef}>
      {trigger}
      {mounted &&
        open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            aria-label={label}
            className={cn(
              "fixed z-[80] w-[min(340px,calc(100vw-1.5rem))] overflow-visible rounded-lg border border-[rgba(201,162,39,0.22)] bg-[var(--bg-elevated)] shadow-[0_8px_24px_rgba(0,0,0,0.45)]",
              contentClassName
            )}
            style={{ top: coords.top, left: coords.left }}
          >
            {side === "right" && (
              <span
                aria-hidden
                className="absolute -left-1.5 top-4 size-3 rotate-45 border-b border-l border-[rgba(201,162,39,0.22)] bg-[var(--bg-elevated)]"
              />
            )}
            {side === "bottom" && (
              <span
                aria-hidden
                className="absolute -top-1.5 left-6 size-3 rotate-45 border-l border-t border-[rgba(201,162,39,0.22)] bg-[var(--bg-elevated)]"
              />
            )}
            <span id={titleId} className="sr-only">
              {label}
            </span>
            <div className="overflow-hidden rounded-lg bg-[var(--bg-elevated)]">
              {children}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
