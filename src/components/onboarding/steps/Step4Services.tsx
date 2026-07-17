"use client";

import { useEffect } from "react";
import { TagInput } from "@/components/onboarding/TagInput";
import { SERVICE_SUGGESTIONS } from "@/lib/onboarding/types";

interface Step4ServicesProps {
  businessType: string;
  value: string[];
  onChange: (services: string[]) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step4Services({
  businessType,
  value,
  onChange,
  onValidityChange,
}: Step4ServicesProps) {
  useEffect(() => {
    onValidityChange(value.length >= 1 && value.length <= 8);
  }, [value, onValidityChange]);

  const suggestions = SERVICE_SUGGESTIONS[businessType] ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          What do you offer?
        </h1>
        <p className="mt-2 text-muted-foreground">
          Add your main services or products.
        </p>
      </div>
      <div className="surface p-6 sm:p-7">
        <TagInput
          value={value}
          onChange={onChange}
          suggestions={suggestions}
        />
      </div>
    </div>
  );
}
