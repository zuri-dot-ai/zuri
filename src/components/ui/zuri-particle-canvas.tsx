"use client";


import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  vx: number;
  vy: number;
}

interface ZuriParticleCanvasProps {
  /** Number of Zuri favicons floating on the canvas */
  count?: number;
  /** Max opacity per particle (0–1). Keep low — it's decorative. */
  opacity?: number;
  className?: string;
  /**
   * Image source. Defaults to /Zuri_Favicon.png. Provide a fallback if
   * hosting assets elsewhere.
   */
  src?: string;
}

/**
 * Signature ambient layer: faded Zuri favicon glyphs drift slowly across
 * the viewport, each rotating gently. Sits behind everything (z-0) and
 * is pointer-events:none, so it never interferes with interaction.
 *
 * Performance notes:
 *  - requestAnimationFrame (pauses when tab is hidden)
 *  - Particles wrap-around edges (no allocation churn)
 *  - ResizeObserver reapplies the particle spread on layout changes
 *  - Cleans up on unmount
 */
export function ZuriParticleCanvas({
  count = 12,
  opacity = 0.04,
  className,
  src = "/Zuri_Favicon.png",
}: ZuriParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = src;

    let animId = 0;
    let particles: Particle[] = [];
    let cancelled = false;

    const initParticles = () => {
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 60 + 20,
        opacity: Math.random() * opacity,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.003,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
      }));
    };

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initParticles();
    };

    const draw = () => {
      if (cancelled) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.rotation += p.rotationSpeed;
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges so density stays uniform
        if (p.x < -p.size) p.x = canvas.width + p.size;
        if (p.x > canvas.width + p.size) p.x = -p.size;
        if (p.y < -p.size) p.y = canvas.height + p.size;
        if (p.y > canvas.height + p.size) p.y = -p.size;

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.drawImage(img, -p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      animId = requestAnimationFrame(draw);
    };

    img.onload = () => {
      if (cancelled) return;
      resize();
      draw();
    };

    // ResizeObserver handles layout shifts (sidebar toggle, responsive)
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [count, opacity, src]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        className
      )}
      style={{ zIndex: 0 }}
    />
  );
}