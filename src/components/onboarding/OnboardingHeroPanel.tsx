"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

const HERO_VIDEO_SRC = "/onboarding/onboarding-hero.mp4";
const HERO_POSTER_SRC = "/onboarding/onboarding-hero.png";
const MAX_RETRIES = 2;

/**
 * Desktop split hero for onboarding shells (`/start`, `/agencies/apply`).
 *
 * Poster stays underneath; video fades in when playing. Transient AbortError /
 * network blips retry load()/play(). NotSupportedError (unsupported H.264
 * profile/level or empty source) gives up immediately — poster remains.
 */
export function OnboardingHeroPanel() {
  const reducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoVisible, setVideoVisible] = useState(false);
  const [videoDisabled, setVideoDisabled] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const retriesRef = useRef(0);

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
    </aside>
  );
}
