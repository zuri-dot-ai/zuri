"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { PremiumModal } from "./PremiumModal";

interface PlanUpgradedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
}

/**
 * Celebration moment for a successful upgrade — the one modal in this
 * system that uses a (deliberately restrained) confetti burst, per
 * explicit request. Requires `canvas-confetti`:
 *
 *   npm install canvas-confetti
 *   npm install -D @types/canvas-confetti
 *
 * The burst is gold-toned to match the brand, fires once on open, and
 * is short (a few hundred ms) — this should read as a tasteful flourish,
 * not a party popper. If canvas-confetti is not desired long-term, the
 * effect is fully isolated to the useEffect below and can be deleted
 * without touching the rest of the modal.
 */
export function PlanUpgradedModal({
  open,
  onOpenChange,
  planName,
}: PlanUpgradedModalProps) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!open || firedRef.current) return;
    firedRef.current = true;

    let cancelled = false;

    import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      const goldTones = ["#c9a84c", "#d4b55f", "#f5f5f4"];

      confetti({
        particleCount: 60,
        spread: 65,
        startVelocity: 32,
        gravity: 1.1,
        ticks: 140,
        origin: { y: 0.35 },
        colors: goldTones,
        scalar: 0.85,
        disableForReducedMotion: true,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) firedRef.current = false;
  }, [open]);

  return (
    <PremiumModal open={open} onOpenChange={onOpenChange} size="sm">
      <div className="flex flex-col items-center px-8 pb-8 pt-10 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{
            duration: 0.55,
            ease: [0.34, 1.56, 0.64, 1], // bold-energetic
          }}
          className="mb-5 flex size-14 items-center justify-center rounded-full"
          style={{
            background: "rgba(201, 168, 76, 0.14)",
            border: "1px solid rgba(201, 168, 76, 0.32)",
          }}
        >
          <Crown className="size-6" style={{ color: "var(--accent)" }} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.35 }}
        >
          <h2 className="font-heading text-2xl leading-tight text-[var(--text-primary)]">
            Welcome to {planName}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            Your upgrade is active. Everything included in {planName} is
            unlocked right now — no need to refresh.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          className="mt-7 w-full"
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full rounded-full px-5 py-2.5 text-sm font-medium transition-transform active:scale-[0.98]"
            style={{
              background: "var(--accent)",
              color: "var(--accent-foreground)",
            }}
          >
            Continue
          </button>
        </motion.div>
      </div>
    </PremiumModal>
  );
}
