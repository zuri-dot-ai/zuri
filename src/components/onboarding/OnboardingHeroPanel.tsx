"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

const HERO_VIDEO_SRC = "/onboarding/onboarding-hero.mp4";
const HERO_POSTER_SRC = "/onboarding/onboarding-hero.png";

/**
 * Desktop split hero for onboarding shells (`/start`, `/agencies/apply`).
 *
 * Root cause (2026-07): both routes already shared OnboardingShell's inline
 * video, but `/start` delayed mounting the shell until session bootstrap
 * finished (`ready === false` → full-page loader). Agency apply mounts the
 * shell immediately. The hero asset is large (~21MB); late mount + concurrent
 * onboarding API traffic made decode/abort `error` events more likely on
 * `/start`. The old panel treated any `onError` as permanent (`videoFailed`)
 * and swapped to the static poster — so `/start` looked broken while apply
 * looked fine, despite identical markup and shared CSP `media-src 'self'`.
 *
 * Fix: one shared panel, poster always underneath, video fades in when
 * playing, transient play/abort errors do not permanently kill the video.
 */
export function OnboardingHeroPanel() {
  const reducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoVisible, setVideoVisible] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    if (reducedMotion) {
      setVideoVisible(false);
      return;
    }

    const el = videoRef.current;
    if (!el) return;

    let cancelled = false;

    const tryPlay = () => {
      if (cancelled) return;
      const playPromise = el.play();
      if (playPromise === undefined) return;
      void playPromise
        .then(() => {
          if (!cancelled) setVideoVisible(true);
        })
        .catch((err: unknown) => {
          // AbortError is common when React remounts or preload races — not fatal.
          const name =
            err && typeof err === "object" && "name" in err
              ? String((err as { name: unknown }).name)
              : "";
          if (name === "AbortError") return;
          console.warn("[OnboardingHeroPanel] play() failed:", err);
        });
    };

    const onPlaying = () => {
      if (!cancelled) setVideoVisible(true);
    };
    const onCanPlay = () => tryPlay();
    const onError = () => {
      // Keep the <video> mounted for a later retry; just show the poster.
      if (!cancelled) setVideoVisible(false);
    };

    el.addEventListener("playing", onPlaying);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("error", onError);

    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      tryPlay();
    }

    return () => {
      cancelled = true;
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("error", onError);
    };
  }, [reducedMotion]);

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

      {!reducedMotion && (
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-500",
            videoVisible ? "opacity-100" : "opacity-0"
          )}
          src={HERO_VIDEO_SRC}
          poster={HERO_POSTER_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
    </aside>
  );
}
