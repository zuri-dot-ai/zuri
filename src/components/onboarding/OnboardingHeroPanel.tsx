"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

const HERO_VIDEO_SRC = "/onboarding/onboarding-hero.mp4";
const HERO_POSTER_SRC = "/onboarding/onboarding-hero.png";
const MAX_RETRIES = 2;

interface OnboardingHeroPanelProps {
  /**
   * 0→1 scroll progress of the current step's content column. When
   * provided, the hero's gold glow subtly intensifies as the user
   * scrolls, so the two panels read as connected rather than static-left
   * vs scrolling-right. Optional — omit or pass undefined to disable
   * (e.g. under prefers-reduced-motion).
   */
  scrollProgress?: MotionValue<number>;
}

/**
 * Desktop split hero for onboarding shells (`/start`, `/agencies/apply`).
 *
 * Poster stays underneath; video fades in when playing. Transient AbortError /
 * network blips retry load()/play(). NotSupportedError (unsupported H.264
 * profile/level or empty source) gives up immediately — poster remains.
 */
export function OnboardingHeroPanel({ scrollProgress }: OnboardingHeroPanelProps) {
  const reducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoVisible, setVideoVisible] = useState(false);
  const [videoDisabled, setVideoDisabled] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const retriesRef = useRef(0);

  // Fallback static value (0) when no scroll motion value is supplied —
  // keeps the hooks below unconditional per rules-of-hooks.
  const fallbackProgress = useRef<MotionValue<number> | null>(null);
  const glowOpacity = useTransform(
    scrollProgress ?? fallbackProgress.current ?? scrollProgress!,
    [0, 1],
    [0.12, 0.32]
  );

  useEffect(() => {
    if (reducedMotion || videoDisabled) {
      setVideoVisible(false);
      return;
    }

    const el = videoRef.current;
    if (!el) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    retriesRef.current = 0;
    let gaveUp = false;

    const giveUp = () => {
      gaveUp = true;
      if (!cancelled) {
        setVideoVisible(false);
        setVideoDisabled(true);
      }
    };

    const tryPlay = () => {
      if (cancelled || gaveUp) return;
      const playPromise = el.play();
      if (playPromise === undefined) return;
      void playPromise
        .then(() => {
          if (!cancelled) setVideoVisible(true);
        })
        .catch((err: unknown) => {
          const name =
            err && typeof err === "object" && "name" in err
              ? String((err as { name: unknown }).name)
              : "";
          if (name === "AbortError") return;
          if (name === "NotSupportedError") {
            giveUp();
            return;
          }
          console.warn("[OnboardingHeroPanel] play() failed:", err);
          scheduleRetry();
        });
    };

    const scheduleRetry = () => {
      if (cancelled || gaveUp || retriesRef.current >= MAX_RETRIES) return;
      retriesRef.current += 1;
      const delay = 400 * retriesRef.current;
      retryTimer = setTimeout(() => {
        if (cancelled || gaveUp) return;
        try {
          el.load();
          tryPlay();
        } catch {
          /* ignore */
        }
      }, delay);
    };

    const onPlaying = () => {
      if (!cancelled) setVideoVisible(true);
    };
    const onCanPlay = () => tryPlay();
    const onError = () => {
      if (cancelled || gaveUp) return;
      setVideoVisible(false);
      if (el.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        giveUp();
        return;
      }
      scheduleRetry();
    };

    el.addEventListener("playing", onPlaying);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("error", onError);

    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      tryPlay();
    }

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("error", onError);
    };
  }, [reducedMotion, videoDisabled]);

  return (
    <aside
      className="relative hidden h-dvh w-[30%] shrink-0 overflow-hidden lg:block"
      aria-hidden
    >
      {!imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={HERO_POSTER_SRC}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(165deg, #1a1814 0%, #0C0C0E 45%, #1f1a12 100%)",
          }}
        />
      )}

      {!reducedMotion && !videoDisabled && (
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-500",
            videoVisible ? "opacity-100" : "opacity-0"
          )}
          poster={HERO_POSTER_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        >
          <source src={HERO_VIDEO_SRC} type="video/mp4" />
        </video>
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />

      {/* Scroll-linked gold glow — subtly intensifies as the questionnaire
          column scrolls, tying the two panels together. No-op (static
          0.12 opacity) when scrollProgress isn't supplied. */}
      {scrollProgress && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: glowOpacity,
            background:
              "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(201,168,76,0.35) 0%, transparent 70%)",
          }}
        />
      )}
    </aside>
  );
}