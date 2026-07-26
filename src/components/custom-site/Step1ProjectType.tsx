"use client";

import { useEffect } from "react";
import {
  Newspaper,
  Store,
  KeyRound,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { SelectionCard } from "@/components/onboarding/SelectionCard";
import { Input } from "@/components/ui/input";
import {
  PROJECT_TYPES,
  PROJECT_TYPE_LABELS,
  type CustomSiteProjectType,
} from "@/lib/custom-site/types";

const ICONS: Record<CustomSiteProjectType, LucideIcon> = {
  "magazine-publication": Newspaper,
  "ecommerce-store": Store,
  "membership-paywall": KeyRound,
  "other-custom": Layers,
};

interface Step1ProjectTypeProps {
  projectType: CustomSiteProjectType | "";
  description: string;
  onProjectTypeChange: (value: CustomSiteProjectType) => void;
  onDescriptionChange: (value: string) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step1ProjectType({
  projectType,
  description,
  onProjectTypeChange,
  onDescriptionChange,
  onValidityChange,
}: Step1ProjectTypeProps) {
  useEffect(() => {
    onValidityChange(
      Boolean(projectType) && description.trim().length >= 10
    );
  }, [projectType, description, onValidityChange]);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div>
        <h1 className="onboarding-headline">What are you building?</h1>
        <p className="onboarding-subtext">
          Tell us the project type and a short description so we can scope it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {PROJECT_TYPES.map((type) => (
          <SelectionCard
            key={type}
            icon={ICONS[type]}
            label={PROJECT_TYPE_LABELS[type]}
            selected={projectType === type}
            onSelect={() => onProjectTypeChange(type)}
            compact
            scaleOnSelect
          />
        ))}
      </div>

      <div className="space-y-2">
        <label className="onboarding-label" htmlFor="custom-site-description">
          Short project description
        </label>
        <Input
          id="custom-site-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="e.g. Online magazine with multi-author CMS and paywalled issues"
          className="onboarding-input h-11"
          maxLength={2000}
        />
        <p className="onboarding-helper">
          At least 10 characters — what should this site do?
        </p>
      </div>
    </div>
  );
}
