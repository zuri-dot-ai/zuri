"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

const AUDIENCE_OPTIONS = [
  { id: "young-professionals", label: "Young professionals" },
  { id: "families", label: "Families" },
  { id: "students", label: "Students" },
  { id: "corporate-clients", label: "Corporate clients" },
  { id: "walk-in-local", label: "Walk-in / local customers" },
  { id: "online-nationwide", label: "Online customers (nationwide or global)" },
  { id: "everyone", label: "Everyone (general public)" },
];

interface Step4AudienceProps {
  value: string[];
  onChange: (audienceTypes: string[]) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step4Audience({
  value,
  onChange,
  onValidityChange,
}: Step4AudienceProps) {
  useEffect(() => {
    onValidityChange(value.length >= 1);
  }, [value, onValidityChange]);

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((a) => a !== id));
    } else {
      onChange([...value, id]);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="onboarding-headline">Who are your customers?</h1>
        <p className="onboarding-subtext">Choose all that apply.</p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {AUDIENCE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            aria-pressed={value.includes(opt.id)}
            className={cn(
              "min-h-[44px] rounded-sm border p-4 text-left text-sm transition-all duration-150",
              value.includes(opt.id)
                ? "scale-[1.01] border-gold bg-gold/[0.08] text-foreground"
                : "border-border bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
