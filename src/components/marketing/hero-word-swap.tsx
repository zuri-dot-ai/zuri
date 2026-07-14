"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

// Particle layer is decorative + heavy — lazy-load it on the client only.
const ZuriParticleCanvas = dynamic(
  () =>
    import("@/components/ui/zuri-particle-canvas").then(
      (m) => m.ZuriParticleCanvas
    ),
  { ssr: false }
);

const BUSINESS_TYPES = [
  "baker",
  "lawyer",
  "photographer",
  "consultant",
  "stylist",
  "caterer",
  "coach",
  "retailer",
];

const EASE = [0.25, 0.1, 0.25, 1] as const;
const ROTATE_MS = 2600;

/**
 * Premium hero — full-viewport video background, particle drift, gradient
 * overlay, blurred word-swap headline and a scroll indicator.
 *
 * Video falls back to the aurora gradient mesh when playback is unavailable.
 */
export function HeroWordSwap() {
  const [index, setIndex] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % BUSINESS_TYPES.length);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative flex min-h-screen w-full items-center justify-center overflow-hidden">
      {/* ── LAYER 0 — Particle canvas (deepest) ──────────── */}
      <ZuriParticleCanvas count={22} opacity={0.05} className="opacity-90" />

      {/* ── LAYER 1 — Animated gradient fallback ────────── */}
      {!videoReady && (
        <div
          aria-hidden
          className="gradient-mesh absolute inset-0"
          style={{ zIndex: 1 }}
        />
      )}

      {/* ── LAYER 2 — Video background ──────────────────── */}
      {!videoFailed && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/Zuri_Logo.png"
          onCanPlay={() => setVideoReady(true)}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            setVideoFailed(true);
          }}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            zIndex: 2,
            opacity: videoReady ? 1 : 0,
            transition: "opacity 800ms ease",
          }}
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
      )}

      {/* ── LAYER 3 — Darkening gradient overlay ────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 3,
          background:
            "linear-gradient(to bottom, rgba(12,12,14,0.55) 0%, rgba(12,12,14,0.55) 45%, rgba(12,12,14,0.85) 80%, #0C0C0E 100%)",
        }}
      />

      {/* Subtle radial vignette to spotlight the headline */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 3,
          background:
            "radial-gradient(ellipse 70% 60% at 50% 45%, transparent 0%, rgba(12,12,14,0.5) 80%)",
        }}
      />

      {/* ── LAYER 4 — Content ───────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-5xl px-6 pb-24 pt-32 text-center md:pt-40">
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
          className="text-xs uppercase tracking-[0.3em] text-gold md:text-sm"
        >
          Built for Africa · Powered by Gemini
        </motion.p>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
          className="mt-6 font-heading text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl lg:text-[5.5rem]"
        >
          Every{" "}
          <span className="relative inline-flex h-[1.1em] items-center justify-center overflow-visible">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -14, filter: "blur(8px)" }}
                transition={{ duration: 0.5, ease: EASE }}
                className="text-gradient-gold"
              >
                {BUSINESS_TYPES[index]}
              </motion.span>
            </AnimatePresence>
          </span>
          <br className="hidden md:block" />
          <span className="md:mt-0">deserves to be found.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.4 }}
          className="mx-auto mt-7 max-w-2xl text-base text-white/70 md:text-xl"
        >
          Zuri turns a single conversation into a live premium website, a
          90-day content plan, and access to vetted execution partners — in
          under 10 minutes.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.6 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <Button
            asChild
            size="lg"
            className="btn-gold-glow min-w-[220px] text-base font-semibold"
          >
            <Link href="/signup">Build your presence</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="min-w-[220px] border-white/15 bg-white/[0.02] text-base backdrop-blur-sm hover:border-gold/40 hover:bg-white/[0.04]"
          >
            <Link href="/how-it-works">See how it works</Link>
          </Button>
        </motion.div>

        {/* Trust micro-line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-5 text-xs text-white/40 md:text-sm"
        >
          Free to start · No credit card required · Live in 10 minutes
        </motion.p>
      </div>

      {/* ── LAYER 5 — Scroll indicator ──────────────────── */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay: 1.2 }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2 text-gold/60">
          <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
          <ChevronDown className="size-6 animate-bounce" strokeWidth={1.5} />
        </div>
      </motion.div>
    </section>
  );
}