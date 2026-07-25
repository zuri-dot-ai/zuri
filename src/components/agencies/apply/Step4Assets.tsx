"use client";

import { useEffect } from "react";
import { ApplyUploadZone, type ApplyUploadedImage } from "./ApplyUploadZone";

interface Step4AssetsProps {
  logoUrl: string | null;
  logoPublicId: string | null;
  portfolioImages: ApplyUploadedImage[];
  onLogoChange: (images: ApplyUploadedImage[]) => void;
  onPortfolioChange: (images: ApplyUploadedImage[]) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step4Assets({
  logoUrl,
  logoPublicId,
  portfolioImages,
  onLogoChange,
  onPortfolioChange,
  onValidityChange,
}: Step4AssetsProps) {
  // All optional — always allow continue / skip
  useEffect(() => {
    onValidityChange(true);
  }, [onValidityChange]);

  // Preview from URL alone — publicId is optional (used as React key when present).
  const logoImages: ApplyUploadedImage[] = logoUrl
    ? [
        {
          publicId: logoPublicId || logoUrl,
          url: logoUrl,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="onboarding-headline">Add visuals</h1>
        <p className="onboarding-subtext">
          Optional — you can skip and add these later if approved.
        </p>
      </div>

      <div className="space-y-8">
        <ApplyUploadZone
          label="Logo (optional)"
          images={logoImages}
          onChange={onLogoChange}
          maxImages={1}
        />

        <ApplyUploadZone
          label="Portfolio images — up to 3 (optional)"
          images={portfolioImages}
          onChange={onPortfolioChange}
          maxImages={3}
        />
      </div>
    </div>
  );
}
