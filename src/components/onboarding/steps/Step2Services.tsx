"use client";

import { useEffect } from "react";
import { ServiceRepeaterInput } from "@/components/onboarding/ServiceRepeaterInput";
import { SERVICE_SUGGESTIONS, type ServiceEntry } from "@/lib/onboarding/types";

interface Step2ServicesProps {
  businessType: string;
  value: ServiceEntry[];
  onChange: (services: ServiceEntry[]) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step2Services({
  businessType,
  value,
  onChange,
  onValidityChange,
}: Step2ServicesProps) {
  const suggestions = SERVICE_SUGGESTIONS[businessType] ?? [];

  useEffect(() => {
    onValidityChange(value.length >= 1);
  }, [value, onValidityChange]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="onboarding-headline">What do you offer?</h1>
        <p className="onboarding-subtext">
          Add each service or product with a short description — this becomes
          your services section.
        </p>
      </div>
      <ServiceRepeaterInput value={value} onChange={onChange} suggestions={suggestions} />
    </div>
  );
}
