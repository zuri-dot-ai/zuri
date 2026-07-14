import type { Variants, Transition } from "framer-motion";
import { MOTION_STYLES } from "./constants";
import type { MotionStyle } from "@/types/database";

/** Build a Framer transition from a Zuri motion token */
export function motionTransition(style: MotionStyle): Transition {
  const m = MOTION_STYLES[style];
  return { duration: m.duration, ease: m.ease };
}

/** Fade-up reveal, parameterized by motion style */
export function fadeUp(style: MotionStyle = "slow_elegant"): Variants {
  return {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: motionTransition(style),
    },
  };
}

/** Stagger container for lists / grids */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

/** Scroll-reveal viewport defaults (use with whileInView) */
export const revealViewport = { once: true, margin: "-80px" } as const;

/** Word-swap for the hero headline (baker → lawyer → photographer) */
export const wordSwap: Variants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.3 } },
};