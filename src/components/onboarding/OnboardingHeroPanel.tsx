"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

const HERO_VIDEO_SRC = "/onboarding/onboarding-hero.mp4";
const HERO_POSTER_SRC = "/onboarding/onboarding-hero.png";

// Cold loads (typed URL / hard refresh) have the video competing with JS,
// CSS, fonts, and the poster for bandwidth — it can genuinely take several
// seconds and multiple stalls before it's ready. Warm client-side nav never
// hits this because everything else is already cached. Give it real room
// to recover before falling back to the poster permanently.
const MAX_RETRIES = 6;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 4000;

interface OnboardingHeroPanelProps {
  scrollProgress?: MotionValue<number>;
}

export function OnboardingHeroPanel({ scrollProgress }: OnboardingHeroPanelProps) {
  const reducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoVisible, setVideoVisible] = useState(false);
  const [videoDisabled, setVideoDisabled] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const retriesRef = useRef(0);

  const glowOpacity = useTransform(
    scrollProgress ?? { get: () => 0 } as MotionValue<number>,
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

    // fetchPriority isn't in React's VideoHTMLAttributes types yet (as of
    // this Next/React version) — set it as a raw DOM property instead of a
    // JSX prop to avoid a TS build error. Valid HTML attribute at runtime.
    try {
      (el as HTMLVideoElement & { fetchPriority?: string }).fetchPriority = "high";
    } catch {
      /* older browsers without the property — harmless no-op */
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let windowLoadRetryDone = false;
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
          // Unsupported codec/container — retries will never help.
          if (name === "NotSupportedError") {
            giveUp();
            return;
          }
          console.warn("[OnboardingHeroPanel] play() failed:", err);
          scheduleRetry();
        });
    };

    const scheduleRetry = () => {
      if (cancelled || gaveUp) return;
      if (retriesRef.current >= MAX_RETRIES) {
        giveUp();
        return;
      }
      retriesRef.current += 1;
      const delay = Math.min(
        RETRY_BASE_DELAY_MS * retriesRef.current,
        RETRY_MAX_DELAY_MS
      );
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
      // MEDIA_ERR_SRC_NOT_SUPPORTED === 4
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

    // Safety net: on a cold load, network contention is worst in the first
    // few seconds. If we've genuinely given up before the page has finished
    // loading its other critical resources, take one more shot once things
    // quiet down — contention will have cleared by then.
    const onWindowLoad = () => {
      if (windowLoadRetryDone || cancelled || !gaveUp) return;
      windowLoadRetryDone = true;
      gaveUp = false;
      setVideoDisabled(false);
      retriesRef.current = 0;
      try {
        el.load();
        tryPlay();
      } catch {
        /* ignore */
      }
    };
    if (document.readyState === "complete") {
      // Already loaded — the immediate attempts above are our only shot,
      // no contention-clearing event left to wait for.
    } else {
      window.addEventListener("load", onWindowLoad, { once: true });
    }

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("error", onError);
      window.removeEventListener("load", onWindowLoad);
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
          preload="auto"
        >
          <source src={HERO_VIDEO_SRC} type="video/mp4" />
        </video>
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />

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