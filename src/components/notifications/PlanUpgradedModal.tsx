"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanUpgradedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
}

export function PlanUpgradedModal({
  open,
  onOpenChange,
  planName,
}: PlanUpgradedModalProps) {
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
                    "max-w-md"
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
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                >
                  <div
                    className="absolute inset-x-0 top-0 h-px"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, var(--accent), transparent)",
                      opacity: 0.6,
                    }}
                  />

                  <Dialog.Close asChild>
                    <button
                      type="button"
                      aria-label="Close"
                      className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-[var(--text-tertiary)] transition-colors duration-150 hover:bg-white/5 hover:text-[var(--text-primary)]"
                    >
                      <X className="size-4" />
                    </button>
                  </Dialog.Close>

                  <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </div>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                      Welcome to {planName}!
                    </h2>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      Your plan is now active. Start building your AI-powered presence.
                    </p>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="mt-6 w-full rounded-lg bg-gold py-2.5 text-sm font-medium text-black transition-colors hover:bg-gold/90"
                      >
                        Go to dashboard
                      </button>
                    </Dialog.Close>
                  </div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
