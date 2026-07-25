"use client";

import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PriceRangeLabel } from "@/lib/agencies/price-range-label";

const PRICE_KEYS = ["budget", "mid", "premium"] as const;

interface Step3ContactProps {
  email: string;
  whatsapp: string;
  priceRange: "budget" | "mid" | "premium" | null;
  onEmailChange: (value: string) => void;
  onWhatsappChange: (value: string) => void;
  onPriceRangeChange: (value: "budget" | "mid" | "premium" | null) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step3Contact({
  email,
  whatsapp,
  priceRange,
  onEmailChange,
  onWhatsappChange,
  onPriceRangeChange,
  onValidityChange,
}: Step3ContactProps) {
  useEffect(() => {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    onValidityChange(emailOk);
  }, [email, onValidityChange]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="onboarding-headline">Contact & pricing</h1>
        <p className="onboarding-subtext">
          How we reach you — and optional pricing for your listing.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-1.5">
          <label className="onboarding-label" htmlFor="agency-email">
            Contact email
          </label>
          <Input
            id="agency-email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="hello@youragency.com"
            className="onboarding-input h-11"
            autoFocus
          />
          <p className="onboarding-helper">
            May differ from the inbox that receives client inquiries later
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="onboarding-label" htmlFor="agency-whatsapp">
            WhatsApp or phone{" "}
            <span className="text-[var(--text-tertiary)]">(optional)</span>
          </label>
          <Input
            id="agency-whatsapp"
            type="tel"
            value={whatsapp}
            onChange={(e) => onWhatsappChange(e.target.value)}
            placeholder="+234…"
            className="onboarding-input h-11"
          />
        </div>

        <div className="space-y-3">
          <div>
            <p className="onboarding-label">
              Price range{" "}
              <span className="text-[var(--text-tertiary)]">(optional)</span>
            </p>
            <p className="onboarding-helper mt-0.5">
              Leave blank if you&apos;d rather discuss pricing directly
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {PRICE_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  onPriceRangeChange(priceRange === key ? null : key)
                }
                className={cn(
                  "min-h-[44px] rounded-sm border px-3.5 py-2 text-sm transition-all duration-150",
                  priceRange === key
                    ? "border-gold bg-gold/10 text-foreground"
                    : "border-border bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
                )}
              >
                <PriceRangeLabel priceRange={key} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
