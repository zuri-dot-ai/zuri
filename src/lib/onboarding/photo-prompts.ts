import type { DesignArchetype } from "@/lib/website/archetypes";

export interface PhotoUploadPrimaryConfig {
  label: string;
  slotType: string;
  minImages: number;
  maxImages: number;
}

export interface PhotoUploadPairedConfig {
  label: string;
  beforeSlot: string;
  afterSlot: string;
  maxPairs: number;
}

export interface PhotoUploadConfig {
  primary: PhotoUploadPrimaryConfig | null;
  pairedSlots: PhotoUploadPairedConfig | null;
}

// docs/01_ONBOARDING_V2.md §5.3 — drives which upload prompt Step 3 shows,
// keyed by the archetype already resolved at Step 1. Before/After archetypes
// never get a stock fallback (Decision 10) — if skipped, that module simply
// doesn't render downstream.
export const PHOTO_UPLOAD_CONFIG: Record<DesignArchetype, PhotoUploadConfig> = {
  "warm-sensory": {
    primary: {
      label: "Add a few photos of your food or space",
      slotType: "gallery",
      minImages: 1,
      maxImages: 4,
    },
    pairedSlots: null,
  },
  "luxury-aspirational": {
    primary: null,
    pairedSlots: {
      label: "Have before-and-after photos? Add them here",
      beforeSlot: "before",
      afterSlot: "after",
      maxPairs: 3,
    },
  },
  "community-vibrant": {
    primary: null,
    pairedSlots: {
      label: "Got transformation photos from clients?",
      beforeSlot: "results_before",
      afterSlot: "results_after",
      maxPairs: 3,
    },
  },
  "editorial-bold": {
    primary: {
      label: "Add a few photos of your products or space",
      slotType: "gallery",
      minImages: 1,
      maxImages: 4,
    },
    pairedSlots: null,
  },
  "portfolio-dramatic": {
    primary: {
      label: "Show us a few pieces of your work",
      slotType: "work",
      minImages: 1,
      maxImages: 6,
    },
    pairedSlots: null,
  },
  "authority-minimal": {
    primary: {
      label: "Add a photo of you or your workspace",
      slotType: "about",
      minImages: 1,
      maxImages: 1,
    },
    pairedSlots: null,
  },
  "trust-professional": {
    primary: {
      label: "Add a photo of your practice or clinic",
      slotType: "about",
      minImages: 1,
      maxImages: 1,
    },
    pairedSlots: null,
  },
  "clean-modern": {
    primary: {
      label: "Add a product screenshot or team photo",
      slotType: "about",
      minImages: 1,
      maxImages: 1,
    },
    pairedSlots: null,
  },
};

/** Defensive fallback if an unsupported archetype somehow reaches Step 3. */
export const DEFAULT_PHOTO_UPLOAD_CONFIG: PhotoUploadConfig = {
  primary: {
    label: "Add a photo of your business",
    slotType: "about",
    minImages: 1,
    maxImages: 1,
  },
  pairedSlots: null,
};

export function getPhotoUploadConfig(
  archetype: DesignArchetype | undefined | null
): PhotoUploadConfig {
  if (!archetype) return DEFAULT_PHOTO_UPLOAD_CONFIG;
  return PHOTO_UPLOAD_CONFIG[archetype] ?? DEFAULT_PHOTO_UPLOAD_CONFIG;
}
