"use client";

import { useEffect } from "react";
import { PhotoUploadZone } from "@/components/onboarding/PhotoUploadZone";
import { getPhotoUploadConfig } from "@/lib/onboarding/photo-prompts";
import type { DesignArchetype } from "@/lib/website/archetypes";
import type { UploadedImageRef } from "@/lib/onboarding/types";

interface Step3PhotoUploadProps {
  sessionToken: string;
  archetype: string;
  images: UploadedImageRef[];
  onChange: (images: UploadedImageRef[]) => void;
  skipped: boolean;
  onSkip: (skipped: boolean) => void;
  onValidityChange: (valid: boolean) => void;
}

/**
 * Step 3 (docs/01_ONBOARDING_V2.md §5) — conditional on archetype. Always
 * skippable: before/after archetypes get no stock fallback if skipped
 * (Decision 10), everything else falls back to curated stock images.
 */
export function Step3PhotoUpload({
  sessionToken,
  archetype,
  images,
  onChange,
  skipped,
  onSkip,
  onValidityChange,
}: Step3PhotoUploadProps) {
  const config = getPhotoUploadConfig(archetype as DesignArchetype);

  useEffect(() => {
    onValidityChange(true); // always skippable
  }, [onValidityChange]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="onboarding-headline">
          {config.primary?.label ?? config.pairedSlots?.label ?? "Add a photo"}
        </h1>
        <p className="onboarding-subtext">
          Real photos make your site feel authentic. You can always add more later.
        </p>
      </div>

      {!skipped && config.primary && (
        <PhotoUploadZone
          sessionToken={sessionToken}
          slotType={config.primary.slotType}
          images={images}
          onChange={onChange}
          maxImages={config.primary.maxImages}
        />
      )}

      {!skipped && config.pairedSlots && (
        <div className="space-y-6">
          {Array.from({ length: config.pairedSlots.maxPairs }).map((_, i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <PhotoUploadZone
                sessionToken={sessionToken}
                slotType={config.pairedSlots!.beforeSlot}
                images={images}
                onChange={onChange}
                maxImages={config.pairedSlots!.maxPairs}
                pairIndex={i}
                label={i === 0 ? "Before" : undefined}
              />
              <PhotoUploadZone
                sessionToken={sessionToken}
                slotType={config.pairedSlots!.afterSlot}
                images={images}
                onChange={onChange}
                maxImages={config.pairedSlots!.maxPairs}
                pairIndex={i}
                label={i === 0 ? "After" : undefined}
              />
            </div>
          ))}
        </div>
      )}

      {skipped && (
        <p className="text-sm text-[var(--text-tertiary)]">
          No problem — you skipped this step. You can add photos anytime from
          your dashboard.
        </p>
      )}

      <button
        type="button"
        onClick={() => onSkip(!skipped)}
        className="text-sm text-gold transition-colors hover:underline"
      >
        {skipped ? "Actually, let me add photos" : "Skip for now →"}
      </button>
    </div>
  );
}
