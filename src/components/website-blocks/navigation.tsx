"use client";

import type { BlockProps } from "./shared";

function navLinks() {
  return ["About", "Services", "Contact"];
}

export function NavStandard({ composition }: BlockProps) {
  const { content, palette } = composition;
  return (
    <header className="sticky top-0 z-40 border-b backdrop-blur-md"
      style={{ borderColor: `${palette.accent}22`, background: `${palette.bg}cc` }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <span className="font-heading text-xl font-semibold" style={{ color: palette.primary }}>
          {content.hero_headline?.split(" ")[0] || "Brand"}
        </span>
        <nav className="hidden gap-8 text-sm md:flex">
          {navLinks().map((l) => (
            <a key={l} href={`#${l.toLowerCase()}`} className="opacity-70 transition-opacity hover:opacity-100">{l}</a>
          ))}
        </nav>
        <a href="#contact" className="rounded-full px-5 py-2 text-sm font-medium"
          style={{ background: palette.accent, color: palette.bg }}>
          {content.cta_text?.slice(0, 20) || "Get in touch"}
        </a>
      </div>
    </header>
  );
}

export function NavCentered({ composition }: BlockProps) {
  const { content, palette } = composition;
  return (
    <header className="border-b py-5" style={{ borderColor: `${palette.accent}22` }}>
      <div className="mx-auto max-w-6xl px-6 text-center">
        <span className="font-heading text-2xl font-semibold tracking-wide" style={{ color: palette.primary }}>
          {content.hero_headline?.split(" ").slice(0, 2).join(" ") || "Brand"}
        </span>
        <nav className="mt-3 flex justify-center gap-8 text-sm">
          {navLinks().map((l) => (
            <a key={l} href={`#${l.toLowerCase()}`} className="opacity-70 hover:opacity-100">{l}</a>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function NavMinimal({ composition }: BlockProps) {
  const { content, palette } = composition;
  return (
    <header className="absolute top-0 z-40 w-full">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-heading text-xl font-semibold" style={{ color: palette.primary }}>
          {content.hero_headline?.split(" ")[0] || "Brand"}
        </span>
        <a href="#contact" className="text-sm underline-offset-4 hover:underline">Contact</a>
      </div>
    </header>
  );
}