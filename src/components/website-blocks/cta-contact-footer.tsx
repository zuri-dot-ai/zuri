"use client";

import type { BlockProps } from "./shared";
import { Reveal, imageAt } from "./shared";

// ── CTA ──────────────────────────────────────────────
export function CtaFullWidth({ composition }: BlockProps) {
  const { content, palette, motion_style } = composition;
  return (
    <section className="px-6 py-24 text-center" style={{ background: palette.accent }}>
      <Reveal motionStyle={motion_style} className="mx-auto max-w-2xl">
        <h2 className="font-heading text-4xl font-semibold md:text-5xl" style={{ color: palette.bg }}>{content.cta_text}</h2>
        <a href="#contact" className="mt-8 inline-block rounded-full px-8 py-3 font-medium"
          style={{ background: palette.bg, color: palette.accent }}>Get started</a>
      </Reveal>
    </section>
  );
}

export function CtaSplitVisual({ composition, images, imageIndex }: BlockProps) {
  const { content, palette, motion_style } = composition;
  const img = imageAt(images, imageIndex);
  return (
    <section className="grid md:grid-cols-2">
      <Reveal motionStyle={motion_style} className="flex flex-col justify-center px-6 py-20 md:px-12">
        <h2 className="font-heading text-4xl font-semibold">{content.cta_text}</h2>
        <a href="#contact" className="mt-6 inline-block w-fit rounded-full px-7 py-3 font-medium"
          style={{ background: palette.accent, color: palette.bg }}>Get started</a>
      </Reveal>
      <div className="relative h-56 md:h-auto">{img && <img src={img} alt="" className="h-full w-full object-cover" />}</div>
    </section>
  );
}

export function CtaCardCentered({ composition }: BlockProps) {
  const { content, palette, motion_style } = composition;
  return (
    <section className="px-6 py-24">
      <Reveal motionStyle={motion_style} className="mx-auto max-w-xl rounded-2xl border p-12 text-center"
      >
        <h2 className="font-heading text-3xl font-semibold">{content.cta_text}</h2>
        <a href="#contact" className="mt-7 inline-block rounded-full px-8 py-3 font-medium"
          style={{ background: palette.accent, color: palette.bg }}>Get in touch</a>
      </Reveal>
    </section>
  );
}

// ── CONTACT ──────────────────────────────────────────
export function ContactFormCard({ composition }: BlockProps) {
  const { content, palette, motion_style } = composition;
  return (
    <section id="contact" className="mx-auto max-w-xl px-6 py-24">
      <Reveal motionStyle={motion_style}>
        <h2 className="text-center font-heading text-4xl font-semibold" style={{ color: palette.primary }}>Get in touch</h2>
        <form className="mt-10 space-y-4 rounded-2xl border p-8" style={{ borderColor: `${palette.accent}22` }}>
          <input placeholder="Your name" className="w-full rounded-lg border bg-transparent px-4 py-3"
            style={{ borderColor: `${palette.accent}33` }} />
          <input placeholder="Your email" className="w-full rounded-lg border bg-transparent px-4 py-3"
            style={{ borderColor: `${palette.accent}33` }} />
          <textarea placeholder="How can we help?" rows={4} className="w-full rounded-lg border bg-transparent px-4 py-3"
            style={{ borderColor: `${palette.accent}33` }} />
          <button type="button" className="w-full rounded-lg py-3 font-medium"
            style={{ background: palette.accent, color: palette.bg }}>Send message</button>
        </form>
      </Reveal>
    </section>
  );
}

export function ContactMapEmbed({ composition }: BlockProps) {
  const { content, palette, motion_style } = composition;
  return (
    <section id="contact" className="mx-auto max-w-4xl px-6 py-24 text-center">
      <Reveal motionStyle={motion_style}>
        <h2 className="font-heading text-4xl font-semibold" style={{ color: palette.primary }}>Visit us</h2>
        <p className="mt-4 opacity-70">{content.contact_email ?? "hello@business.com"}</p>
      </Reveal>
    </section>
  );
}

export function WhatsappCta({ composition }: BlockProps) {
  const { palette, motion_style, content } = composition;
  const num = content.whatsapp_number ?? "";
  return (
    <section id="contact" className="px-6 py-24 text-center">
      <Reveal motionStyle={motion_style}>
        <h2 className="font-heading text-3xl font-semibold">Chat with us</h2>
        <a href={`https://wa.me/${num.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
          className="mt-6 inline-block rounded-full px-8 py-3 font-medium"
          style={{ background: "#25D366", color: "#fff" }}>Message us on WhatsApp</a>
      </Reveal>
    </section>
  );
}

// ── FOOTER ───────────────────────────────────────────
export function FooterStandard({ composition }: BlockProps) {
  const { content, palette } = composition;
  return (
    <footer className="border-t px-6 py-12" style={{ borderColor: `${palette.accent}22` }}>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
        <span className="font-heading text-xl font-semibold" style={{ color: palette.primary }}>
          {content.hero_headline?.split(" ")[0]}
        </span>
        <p className="text-xs opacity-50">Built with Zuri · Powered by Gemini</p>
      </div>
    </footer>
  );
}

export function FooterMinimal({ composition }: BlockProps) {
  const { palette } = composition;
  return (
    <footer className="py-10 text-center">
      <p className="text-xs opacity-40" style={{ color: palette.primary }}>Built with Zuri</p>
    </footer>
  );
}

export function FooterColumns({ composition }: BlockProps) {
  return <FooterStandard composition={composition} images={[]} imageIndex={0} />;
}