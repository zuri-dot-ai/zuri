"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { PremiumModal } from "./PremiumModal";

interface WebsiteGeneratedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteName: string;
  previewUrl: string;
}

/**
 * The core "payoff" moment — a user's AI-generated website is ready to
 * preview for the first time. This replaces:
 *   toast.success("Your website is ready!")
 * in generation-status-card.tsx.
 *
 * Deliberately NOT wired through the priority queue — this is a direct
 * result of a user-initiated action (generation finishing), so it should
 * show immediately rather than waiting its turn behind What's New etc.
 * If both happen to be pending, that's an edge case worth revisiting
 * later, but generation completion should never feel delayed.
 */
export function WebsiteGeneratedModal({
  open,
  onOpenChange,
  siteName,
  previewUrl,
}: WebsiteGeneratedModalProps) {
  return (
    <PremiumModal open={open} onOpenChange={onOpenChange} size="sm">
      <div className="flex flex-col items-center px-8 pb-8 pt-10 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.5,
            ease: [0.34, 1.56, 0.64, 1], // your bold-energetic curve
          }}
          className="mb-5 flex size-14 items-center justify-center rounded-full"
          style={{
            background: "rgba(201, 168, 76, 0.12)",
            border: "1px solid rgba(201, 168, 76, 0.28)",
          }}
        >
          <Sparkles className="size-6" style={{ color: "var(--accent)" }} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
        >
          <h2 className="font-heading text-2xl leading-tight text-[var(--text-primary)]">
            Your website is ready
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            {siteName} has been generated. Take a look, then publish it when
            you&apos;re happy.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          className="mt-7 flex w-full flex-col gap-2"
        >
          <a
            href={previewUrl}
            className="flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition-transform active:scale-[0.98]"
            style={{
              background: "var(--accent)",
              color: "var(--accent-foreground)",
            }}
          >
            Preview your site
            <ArrowRight className="size-3.5" />
          </a>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full py-2 text-sm text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
          >
            I&apos;ll look later
          </button>
        </motion.div>
      </div>
    </PremiumModal>
  );
}
