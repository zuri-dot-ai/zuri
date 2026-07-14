"use client";

import type { BlockProps } from "./shared";
import { Reveal, imageAt } from "./shared";

export function AboutFounder({ composition, images, imageIndex }: BlockProps) {
  const { content, palette, motion_style } = composition;
  const img = imageAt(images, imageIndex);
  return (
    <section id="about" className="mx-auto max-w-6xl px-6 py-24">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <Reveal motionStyle={motion_style}>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
            {img && <img src={img} alt="" className="h-full w-full object-cover" />}
          </div>
        </Reveal>
        <Reveal motionStyle={motion_style} delay={0.15}>
          <h2 className="font-heading text-4xl font-semibold" style={{ color: palette.primary }}>Our Story</h2>
          <p className="mt-6 text-lg leading-relaxed opacity-80">{content.about_paragraph}</p>
        </Reveal>
      </div>
    </section>
  );
}

export function AboutStats({ composition }: BlockProps) {
  const { content, palette, motion_style } = composition;
  const stats = content.stats ?? [
    { value: "100+", label: "Happy clients" },
    { value: "5★", label: "Average rating" },
    { value: "24h", label: "Response time" },
  ];
  return (
    <section id="about" className="mx-auto max-w-6xl px-6 py-24">
      <Reveal motionStyle={motion_style}>
        <p className="mx-auto max-w-2xl text-center text-xl leading-relaxed opacity-80">{content.about_paragraph}</p>
      </Reveal>
      <div className="mt-14 grid grid-cols-3 gap-6">
        {stats.map((s, i) => (
          <Reveal key={i} motionStyle={motion_style} delay={i * 0.1}>
            <div className="text-center">
              <div className="font-heading text-5xl font-semibold" style={{ color: palette.accent }}>{s.value}</div>
              <div className="mt-2 text-sm uppercase tracking-wider opacity-60">{s.label}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function AboutTimeline({ composition }: BlockProps) {
  const { content, palette, motion_style } = composition;
  return (
    <section id="about" className="mx-auto max-w-3xl px-6 py-24">
      <Reveal motionStyle={motion_style}>
        <h2 className="font-heading text-4xl font-semibold" style={{ color: palette.primary }}>About</h2>
        <p className="mt-6 text-lg leading-relaxed opacity-80">{content.about_paragraph}</p>
      </Reveal>
    </section>
  );
}

export function AboutMission({ composition }: BlockProps) {
  const { content, palette, motion_style } = composition;
  return (
    <section id="about" className="px-6 py-28" style={{ background: `${palette.accent}0d` }}>
      <Reveal motionStyle={motion_style} className="mx-auto max-w-3xl text-center">
        <h2 className="font-heading text-3xl font-medium leading-snug md:text-5xl">{content.about_paragraph}</h2>
      </Reveal>
    </section>
  );
}