"use client";

import { useCallback, useEffect, useState } from "react";
import { HandleInput } from "@/components/onboarding/HandleInput";

interface Step8HandleProps {
  businessName: string;
  value: string;
  onChange: (value: string) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step8Handle({
  businessName,
  value,
  onChange,
  onValidityChange,
}: Step8HandleProps) {
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(false);

  const onAvailabilityChange = useCallback(
    (isAvailable: boolean, isChecking: boolean) => {
      setAvailable(isAvailable);
      setChecking(isChecking);
    },
    []
  );

  useEffect(() => {
    onValidityChange(available && !checking);
  }, [available, checking, onValidityChange]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="onboarding-headline">Choose your web address</h1>
        <p className="onboarding-subtext">This is where people will find you online.</p>
      </div>
      <div className="onboarding-panel">
        <HandleInput
          businessName={businessName}
          value={value}
          onChange={onChange}
          onAvailabilityChange={onAvailabilityChange}
        />
      </div>
    </div>
  );
}
