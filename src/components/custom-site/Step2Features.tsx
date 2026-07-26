"use client";

import { useEffect } from "react";
import { SelectionCard } from "@/components/onboarding/SelectionCard";
import { Input } from "@/components/ui/input";
import {
  FEATURES,
  FEATURE_LABELS,
  type CustomSiteFeature,
} from "@/lib/custom-site/types";

interface Step2FeaturesProps {
  features: CustomSiteFeature[];
  customIntegrationsText: string;
  otherFeaturesText: string;
  onFeaturesChange: (value: CustomSiteFeature[]) => void;
  onCustomIntegrationsTextChange: (value: string) => void;
  onOtherFeaturesTextChange: (value: string) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step2Features({
  features,
  customIntegrationsText,
  otherFeaturesText,
  onFeaturesChange,
  onCustomIntegrationsTextChange,
  onOtherFeaturesTextChange,
  onValidityChange,
}: Step2FeaturesProps) {
  const needsCustom = features.includes("custom-integrations");
  const needsOther = features.includes("other");

  useEffect(() => {
    const customOk = !needsCustom || customIntegrationsText.trim().length >= 3;
    const otherOk = !needsOther || otherFeaturesText.trim().length >= 3;
    onValidityChange(features.length > 0 && customOk && otherOk);
  }, [
    features,
    needsCustom,
    needsOther,
    customIntegrationsText,
    otherFeaturesText,
    onValidityChange,
  ]);

  function toggle(feature: CustomSiteFeature) {
    if (features.includes(feature)) {
      onFeaturesChange(features.filter((f) => f !== feature));
    } else {
      onFeaturesChange([...features, feature]);
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div>
        <h1 className="onboarding-headline">Features needed</h1>
        <p className="onboarding-subtext">
          Select everything that applies — we&apos;ll use this to scope the build.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <SelectionCard
            key={feature}
            label={FEATURE_LABELS[feature]}
            selected={features.includes(feature)}
            onSelect={() => toggle(feature)}
            multi
            compact
          />
        ))}
      </div>

      {needsCustom && (
        <div className="space-y-2">
          <label
            className="onboarding-label"
            htmlFor="custom-integrations-text"
          >
            Custom integrations
          </label>
          <Input
            id="custom-integrations-text"
            value={customIntegrationsText}
            onChange={(e) => onCustomIntegrationsTextChange(e.target.value)}
            placeholder="e.g. Paystack, Flutterwave, custom ERP API"
            className="onboarding-input h-11"
            maxLength={1000}
          />
        </div>
      )}

      {needsOther && (
        <div className="space-y-2">
          <label className="onboarding-label" htmlFor="other-features-text">
            Other features
          </label>
          <Input
            id="other-features-text"
            value={otherFeaturesText}
            onChange={(e) => onOtherFeaturesTextChange(e.target.value)}
            placeholder="Anything else we should know about"
            className="onboarding-input h-11"
            maxLength={1000}
          />
        </div>
      )}
    </div>
  );
}
