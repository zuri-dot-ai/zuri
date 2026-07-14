"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { WebsiteComposition } from "@/types/website";
import { MOTION_STYLES } from "@/lib/constants";

/** Props every block receives from the renderer */
export interface BlockProps {
  composition: WebsiteComposition;
  images: string[];
  imageIndex: number; // which image this block should pull
}

/** Scroll-reveal wrapper keyed to the composition's motion style */
export function Reveal({
  children,
  motionStyle,
  delay = 0,
  className,
}: {
  children: ReactNode;
  motionStyle: WebsiteComposition["motion_style"];
  delay?: number;
  className?: string;
}) {
  const m = MOTION_STYLES[motionStyle] ?? MOTION_STYLES.slow_elegant;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: m.duration, ease: m.ease, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Pull an image safely, falling back to a gradient if none */
export function imageAt(images: string[], index: number): string | null {
  return images[index] ?? images[0] ?? null;
}