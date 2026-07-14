"use client";

import type { BlockProps } from "./shared";
import { Reveal } from "./shared";

export function TestimonialsCarousel({ composition }: BlockProps) {
  const { content, palette, motion_style } = composition;
  const items = content.testimonials ?? [
    { quote: "Working with them transformed our business completely.", author: "A satisfied client" },
  ];
  return (
    <section className="px-6 py-24" style={{ background: `${palette.accent}0d` }}>
      <div className="mx-auto max-w-4xl">
        <div className="flex gap-6 overflow-x-auto pb-4">
          {items.map((t, i) => (
            <Reveal key={i} motionStyle={motion_style} delay={i * 0.1} className="min-w-[300px] flex-1">
              <blockquote className="rounded-2xl border p-8" style={{ borderColor: `${palette.accent}22` }}>
                <p className="font-heading text-xl italic leading-relaxed">“{t.quote}”</p>
                <footer className="mt-5 text-sm opacity-70">— {t.author}{t.role ? `, ${t.role}` : ""}</footer>
              </blockquote>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LogoWall({ composition }: BlockProps) {
  const { palette, motion_style } = composition;
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <Reveal motionStyle={motion_style}>
        <p className="text-center text-sm uppercase tracking-widest opacity-50">Trusted by businesses across Nigeria</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-40">
          {["Client", "Partner", "Brand", "Studio", "Group"].map((l) => (
            <span key={l} className="font-heading text-2xl" style={{ color: palette.primary }}>{l}</span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function CaseStudySpotlight({ composition }: BlockProps) {
  const { content, palette, motion_style } = composition;
  const t = content.testimonials?.[0];
  return (
    <section className="mx-auto max-w-4xl px-6 py-24 text-center">
      <Reveal motionStyle={motion_style}>
        <p className="font-heading text-3xl leading-relaxed md:text-4xl">
          “{t?.quote ?? "A result we're proud of."}”
        </p>
        <p className="mt-6 text-sm opacity-60" style={{ color: palette.accent }}>{t?.author ?? "Featured client"}</p>
      </Reveal>
    </section>
  );
}