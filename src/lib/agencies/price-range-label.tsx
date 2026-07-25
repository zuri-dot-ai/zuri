import type { ReactNode } from "react";
import { PRICE_RANGE_LABELS } from "@/lib/agencies/types";

/**
 * Renders a price-range label with ₦ glyphs in a system-font stack so the
 * Naira sign never falls back to a broken "N" strikethrough when a webfont
 * (Montserrat/Cormorant) lacks U+20A6 — even after latin-ext is loaded.
 */
export function PriceRangeLabel({
  priceRange,
  className,
}: {
  priceRange: string;
  className?: string;
}): ReactNode {
  const label = PRICE_RANGE_LABELS[priceRange];
  if (!label) return priceRange;

  const match = /^(₦+)\s*(.*)$/u.exec(label);
  if (!match) return <span className={className}>{label}</span>;

  const [, naira, rest] = match;
  return (
    <span className={className}>
      <span
        className="font-[system-ui,'Segoe_UI',Roboto,Helvetica,Arial,sans-serif]"
        aria-hidden={false}
      >
        {naira}
      </span>
      {rest ? ` ${rest}` : null}
    </span>
  );
}
