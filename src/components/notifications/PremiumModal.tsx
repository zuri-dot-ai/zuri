"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PremiumModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /** Hide the default close button (e.g. if the footer has its own primary dismiss action). */
  hideCloseButton?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<PremiumModalProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

/**
 * Shared visual shell for every premium modal in Zuri.
 * Radix handles focus trap / scroll lock / escape / aria wiring.
 * Framer Motion handles the entrance/exit choreography.
 * Styling uses the existing chrome/gold CSS variables — no invented colors.
 */
export function PremiumModal({
  open,
  onOpenChange,
  children,
  hideCloseButton = false,
  size = "md",
  className,
}: PremiumModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            </Dialog.Overlay>

            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
              <Dialog.Content asChild forceMount>
                <motion.div
                  className={cn(
                    "relative w-full overflow-hidden rounded-[var(--radius-lg)] border",
                    SIZE_CLASS[size],
                    className
                  )}
                  style={{
                    background:
                      "linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg-secondary) 100%)",
                    borderColor: "var(--border-solid)",
                    boxShadow:
                      "0 0 0 1px rgba(201, 168, 76, 0.08), 0 24px 64px rgba(0,0,0,0.5)",
                  }}
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: 8 }}
                  transition={{
                    duration: 0.3,
                    ease: [0.25, 0.1, 0.25, 1], // matches your slow-elegant curve
                  }}
                >
                  {/* Hairline gold top accent — subtle premium signature */}
                  <div
                    className="absolute inset-x-0 top-0 h-px"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, var(--accent), transparent)",
                      opacity: 0.6,
                    }}
                  />

                  {!hideCloseButton && (
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        aria-label="Close"
                        className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-[var(--text-tertiary)] transition-colors duration-150 hover:bg-white/5 hover:text-[var(--text-primary)]"
                      >
                        <X className="size-4" />
                      </button>
                    </Dialog.Close>
                  )}

                  {children}
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
