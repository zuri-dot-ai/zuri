"use client";

import { useEffect } from "react";

const HOLD_MS = 5000;
const FADE_MS = 2000;
const WIRED = "data-ghost-pulse";

/**
 * Marketing-site btn-ghost auto-pulse (script.js): draw gold border like
 * hover, hold, fade, repeat — paused while the user is interacting.
 * Scoped to `.auth-canvas` so onboarding + login/signup share the effect.
 */
export function AuthBtnGhostPulse() {
  useEffect(() => {
    const canvas = document.querySelector(".auth-canvas");
    if (!canvas) return;
    const root = canvas;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const cleanups = new Map<Element, () => void>();

    function wire(btn: HTMLElement) {
      if (btn.getAttribute(WIRED) === "1") return;
      btn.setAttribute(WIRED, "1");

      let hovering = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      function clearTimer() {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      }

      function activate() {
        if (hovering) return;
        btn.classList.remove("auto-fading");
        void btn.offsetWidth;
        btn.classList.add("auto-active");
        clearTimer();
        timer = setTimeout(() => {
          if (!hovering) fade();
        }, HOLD_MS);
      }

      function fade() {
        btn.classList.remove("auto-active");
        btn.classList.add("auto-fading");
        clearTimer();
        timer = setTimeout(() => {
          btn.classList.remove("auto-fading");
          activate();
        }, FADE_MS);
      }

      function onEnter() {
        hovering = true;
        clearTimer();
        btn.classList.remove("auto-active", "auto-fading");
      }

      function onLeave() {
        hovering = false;
        clearTimer();
        timer = setTimeout(activate, 500);
      }

      btn.addEventListener("mouseenter", onEnter);
      btn.addEventListener("mouseleave", onLeave);
      btn.addEventListener("touchstart", onEnter, { passive: true });
      btn.addEventListener("touchend", onLeave, { passive: true });
      activate();

      cleanups.set(btn, () => {
        clearTimer();
        btn.removeEventListener("mouseenter", onEnter);
        btn.removeEventListener("mouseleave", onLeave);
        btn.removeEventListener("touchstart", onEnter);
        btn.removeEventListener("touchend", onLeave);
        btn.classList.remove("auto-active", "auto-fading");
        btn.removeAttribute(WIRED);
      });
    }

    function scan() {
      const live = new Set(
        root.querySelectorAll<HTMLElement>(".btn-ghost")
      );
      cleanups.forEach((dispose, el) => {
        if (!live.has(el as HTMLElement)) {
          dispose();
          cleanups.delete(el);
        }
      });
      live.forEach(wire);
    }

    scan();

    const observer = new MutationObserver(() => scan());
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanups.forEach((dispose) => dispose());
      cleanups.clear();
    };
  }, []);

  return null;
}
