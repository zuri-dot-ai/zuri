"use client";

import { useEffect } from "react";
import { Instagram, Facebook, Linkedin } from "lucide-react";
import { SelectionCard } from "@/components/onboarding/SelectionCard";

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.18 8.18 0 0 0 4.76 1.52V6.79a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "facebook", label: "Facebook", icon: Facebook },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin },
  { id: "x", label: "X (Twitter)", icon: XIcon },
  { id: "tiktok", label: "TikTok", icon: TikTokIcon },
] as const;

interface Step7PlatformsProps {
  value: string[];
  onChange: (platforms: string[]) => void;
  onValidityChange: (valid: boolean) => void;
  onSkip: () => void;
}

export function Step7Platforms({
  value,
  onChange,
  onValidityChange,
  onSkip,
}: Step7PlatformsProps) {
  useEffect(() => {
    onValidityChange(true);
  }, [onValidityChange]);

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((p) => p !== id));
    } else {
      onChange([...value, id]);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] text-foreground md:text-[2rem]">
          Where do you want to show up?
        </h1>
        <p className="mt-2 text-[0.9375rem] text-[var(--text-secondary)]">
          Choose all that apply. You can change this later.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {PLATFORMS.map((platform) => (
          <SelectionCard
            key={platform.id}
            icon={platform.icon}
            label={platform.label}
            selected={value.includes(platform.id)}
            onSelect={() => toggle(platform.id)}
            multi
          />
        ))}
      </div>

      <p className="text-caption text-[var(--text-tertiary)]">
        Platform availability depends on your plan. You can adjust this at any
        time.
      </p>

      <button
        type="button"
        onClick={onSkip}
        className="text-sm text-gold transition-colors hover:underline"
      >
        I&apos;ll set this up later →
      </button>
    </div>
  );
}
