"use client";

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  z: number;
  gold: boolean;
  tw: number;
};

/**
 * Marketing-site ambient starfield (script.js — 180 stars, no burst).
 * Auth / onboarding only.
 */
export function StarfieldCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let w = 0;
    let h = 0;
    let cx = 0;
    let cy = 0;
    let raf = 0;

    const COUNT = prefersReduced ? 0 : 180;
    const FOCAL = 260;
    const SPEED = 0.09;

    function spawnStar(): Star {
      return {
        x: (Math.random() - 0.5) * w * 1.6,
        y: (Math.random() - 0.5) * h * 1.6,
        z: 0.15 + Math.random() * 1,
        gold: Math.random() < 0.3,
        tw: Math.random() * Math.PI * 2,
      };
    }

    let stars: Star[] = [];

    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = w / 2;
      cy = h / 2;
    }

    size();
    stars = Array.from({ length: COUNT }, spawnStar);
    window.addEventListener("resize", size);

    function draw(now: number) {
      ctx!.fillStyle = "rgba(10,10,10,0.35)";
      ctx!.fillRect(0, 0, w, h);
      for (const s of stars) {
        s.z -= SPEED * 0.016;
        if (s.z <= 0.02) Object.assign(s, spawnStar(), { z: 1 });
        const sx = cx + (s.x / s.z) * (FOCAL / 300);
        const sy = cy + (s.y / s.z) * (FOCAL / 300);
        if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue;
        const depth = 1 - s.z;
        const r = Math.max(0.3, depth * 1.8);
        const tw = 0.5 + 0.4 * Math.sin(now * 0.002 + s.tw);
        const alpha = Math.min(0.85, depth * 0.9) * tw;
        ctx!.beginPath();
        ctx!.arc(sx, sy, r, 0, Math.PI * 2);
        ctx!.fillStyle = s.gold
          ? `rgba(240,200,120,${alpha})`
          : `rgba(201,206,214,${alpha * 0.85})`;
        ctx!.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    if (!prefersReduced) {
      raf = requestAnimationFrame(draw);
    } else {
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, h);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
