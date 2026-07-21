"use client";

import type { BlockProps } from "./shared";
import { Reveal } from "./shared";

export function ServicesCardGrid({ composition }: BlockProps) {
  const { content, palette, motion_style } = composition;
  return (
    <section id="services" className="mx-auto max-w-6xl px-6 py-24">
      <Reveal motionStyle={motion_style}>
        <h2 className="text-center font-heading text-4xl font-semibold" style={{ color: palette.primary }}>What We Offer</h2>
      </Reveal>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {content.services?.map((s, i) => (
          <Reveal key={i} motionStyle={motion_style} delay={i * 0.1}>
            <div className="h-full rounded-xl border p-7" style={{ borderColor: `${palette.accent}22` }}>
              <div className="mb-4 flex size-11 items-center justify-center rounded-lg font-heading text-xl font-semibold"
                style={{ background: `${palette.accent}1a`, color: palette.accent }}>{i + 1}</div>
              <h3 className="break-words font-heading text-xl font-semibold">{s.name}</h3>
              <p className="mt-3 break-words text-sm leading-relaxed opacity-70">{s.description}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function ServicesListElegant({ composition }: BlockProps) {
  const { content, palette, motion_style } = composition;
  return (
    <section id="services" className="mx-auto max-w-3xl px-6 py-24">
      <Reveal motionStyle={motion_style}>
        <h2 className="font-heading text-4xl font-semibold" style={{ color: palette.primary }}>Services</h2>
      </Reveal>
      <div className="mt-10 divide-y" style={{ borderColor: `${palette.accent}22` }}>
        {content.services?.map((s, i) => (
          <Reveal key={i} motionStyle={motion_style} delay={i * 0.08}>
            <div className="flex gap-6 py-7" style={{ borderColor: `${palette.accent}22` }}>
              <span className="font-mono text-sm opacity-50">0{i + 1}</span>
              <div>
                <h3 className="break-words font-heading text-2xl">{s.name}</h3>
                <p className="mt-2 break-words opacity-70">{s.description}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function ServicesTabs({ composition }: BlockProps) {
  // Static render (tab interactivity optional); grid fallback for reliability
  return <ServicesCardGrid composition={composition} images={[]} imageIndex={0} />;
}

export function PricingTable({ composition }: BlockProps) {
  const { content, palette, motion_style } = composition;
  return (
    <section id="services" className="mx-auto max-w-5xl px-6 py-24">
      <Reveal motionStyle={motion_style}>
        <h2 className="text-center font-heading text-4xl font-semibold" style={{ color: palette.primary }}>Pricing</h2>
      </Reveal>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {(content.services ?? []).slice(0, 3).map((s, i) => (
          <Reveal key={i} motionStyle={motion_style} delay={i * 0.1}>
            <div className="rounded-xl border p-8 text-center" style={{ borderColor: i === 1 ? palette.accent : `${palette.accent}22` }}>
              <h3 className="break-words font-heading text-2xl">{s.name}</h3>
              <p className="mt-4 break-words text-sm opacity-70">{s.description}</p>
              <a href="#contact" className="mt-6 inline-block rounded-full px-6 py-2 text-sm font-medium"
                style={{ background: palette.accent, color: palette.bg }}>Enquire</a>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}