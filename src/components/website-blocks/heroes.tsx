"use client";

import { motion } from "framer-motion";
import type { BlockProps } from "./shared";
import { imageAt } from "./shared";

export function HeroFullscreen({ composition, images, imageIndex }: BlockProps) {
  const { content, palette } = composition;
  const img = imageAt(images, imageIndex);
  return (
    <section className="relative flex min-h-[88vh] items-center justify-center overflow-hidden">
      {img && <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${palette.bg}, ${palette.bg}99, ${palette.bg}55)` }} />
      <motion.div className="relative z-10 max-w-3xl px-6 text-center"
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}>
        <h1 className="break-words font-heading text-5xl font-semibold leading-tight md:text-7xl">{content.hero_headline}</h1>
        <p className="mx-auto mt-6 max-w-xl text-lg opacity-80">{content.hero_subheadline}</p>
        <a href="#contact" className="mt-8 inline-block rounded-full px-8 py-3 font-medium"
          style={{ background: palette.accent, color: palette.bg }}>{content.cta_text}</a>
      </motion.div>
    </section>
  );
}

export function HeroSplit({ composition, images, imageIndex }: BlockProps) {
  const { content, palette } = composition;
  const img = imageAt(images, imageIndex);
  return (
    <section className="grid min-h-[80vh] items-center md:grid-cols-2">
      <motion.div className="px-6 py-16 md:px-12"
        initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
        <h1 className="break-words font-heading text-4xl font-semibold leading-tight md:text-6xl">{content.hero_headline}</h1>
        <p className="mt-6 max-w-md text-lg opacity-80">{content.hero_subheadline}</p>
        <a href="#contact" className="mt-8 inline-block rounded-full px-8 py-3 font-medium"
          style={{ background: palette.accent, color: palette.bg }}>{content.cta_text}</a>
      </motion.div>
      <div className="relative h-64 md:h-full">
        {img && <img src={img} alt="" className="h-full w-full object-cover" />}
      </div>
    </section>
  );
}

export function HeroTypographic({ composition }: BlockProps) {
  const { content, palette } = composition;
  return (
    <section className="flex min-h-[80vh] items-center justify-center px-6">
      <motion.div className="text-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
        <h1 className="break-words font-heading text-6xl font-semibold leading-[1.05] md:text-8xl"
          style={{ color: palette.primary }}>{content.hero_headline}</h1>
        <p className="mx-auto mt-8 max-w-xl text-xl opacity-70">{content.hero_subheadline}</p>
        <a href="#contact" className="mt-10 inline-block border-b-2 pb-1 text-lg font-medium"
          style={{ borderColor: palette.accent, color: palette.accent }}>{content.cta_text} →</a>
      </motion.div>
    </section>
  );
}

export function HeroGradient({ composition }: BlockProps) {
  const { content, palette } = composition;
  return (
    <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-6">
      <motion.div className="absolute inset-0"
        animate={{ background: [
          `radial-gradient(circle at 20% 30%, ${palette.accent}33, ${palette.bg} 60%)`,
          `radial-gradient(circle at 80% 70%, ${palette.accent}33, ${palette.bg} 60%)`,
          `radial-gradient(circle at 20% 30%, ${palette.accent}33, ${palette.bg} 60%)`,
        ] }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }} />
      <div className="relative z-10 max-w-3xl text-center">
        <h1 className="break-words font-heading text-5xl font-semibold md:text-7xl">{content.hero_headline}</h1>
        <p className="mx-auto mt-6 max-w-xl text-lg opacity-80">{content.hero_subheadline}</p>
        <a href="#contact" className="mt-8 inline-block rounded-full px-8 py-3 font-medium"
          style={{ background: palette.accent, color: palette.bg }}>{content.cta_text}</a>
      </div>
    </section>
  );
}

export function HeroFloatingCard({ composition, images, imageIndex }: BlockProps) {
  const { content, palette } = composition;
  const img = imageAt(images, imageIndex);
  return (
    <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-6">
      {img && <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
      <div className="absolute inset-0" style={{ background: `${palette.bg}aa` }} />
      <motion.div className="relative z-10 max-w-lg rounded-2xl border p-10 backdrop-blur-xl"
        style={{ borderColor: `${palette.accent}33`, background: `${palette.bg}cc` }}
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
        <h1 className="break-words font-heading text-4xl font-semibold md:text-5xl">{content.hero_headline}</h1>
        <p className="mt-5 text-lg opacity-80">{content.hero_subheadline}</p>
        <a href="#contact" className="mt-7 inline-block rounded-full px-7 py-3 font-medium"
          style={{ background: palette.accent, color: palette.bg }}>{content.cta_text}</a>
      </motion.div>
    </section>
  );
}

export function HeroMinimal({ composition }: BlockProps) {
  const { content, palette } = composition;
  return (
    <section className="flex min-h-[70vh] items-center justify-center px-6">
      <motion.div className="text-center"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
        <span className="font-heading text-3xl font-semibold" style={{ color: palette.primary }}>
          {content.hero_headline?.split(" ").slice(0, 2).join(" ")}
        </span>
        <h1 className="mx-auto mt-6 max-w-2xl break-words font-heading text-4xl font-medium leading-snug md:text-5xl">
          {content.hero_subheadline}
        </h1>
        <a href="#contact" className="mt-10 inline-block text-sm uppercase tracking-widest opacity-70 hover:opacity-100"
          style={{ color: palette.accent }}>{content.cta_text}</a>
      </motion.div>
    </section>
  );
}