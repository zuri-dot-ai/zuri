"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { safeFetchJSON, FetchError } from "@/lib/utils/safe-fetch";
import type { UploadedImageRef } from "@/lib/onboarding/types";

interface PhotoUploadZoneProps {
  sessionToken: string;
  slotType: string;
  images: UploadedImageRef[];
  onChange: (images: UploadedImageRef[]) => void;
  maxImages: number;
  pairIndex?: number;
  label?: string;
}

/**
 * Single upload slot for a given `slotType` — used both for the primary
 * gallery config and each side of a before/after pair (docs/01_ONBOARDING_V2.md
 * §5.2). Client-side type/size checks are UX-only; the server re-validates.
 */
export function PhotoUploadZone({
  sessionToken,
  slotType,
  images,
  onChange,
  maxImages,
  pairIndex,
  label,
}: PhotoUploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const slotImages = images.filter(
    (img) => img.slotType === slotType && img.pairIndex === pairIndex
  );

  async function handleFile(file: File) {
    setError(null);

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("This image is too large (max 10MB).");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("slot", slotType);
      form.append("sessionToken", sessionToken);
      if (pairIndex !== undefined) form.append("pairIndex", String(pairIndex));

      const result = await safeFetchJSON<{
        publicId: string;
        url: string;
      }>("/api/onboarding/upload-image", {
        method: "POST",
        body: form,
      });

      onChange([
        ...images,
        {
          slotType,
          cloudinaryPublicId: result.publicId,
          cloudinaryUrl: result.url,
          pairIndex,
        },
      ]);
    } catch (err) {
      setError(err instanceof FetchError ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeImage(publicId: string) {
    onChange(images.filter((img) => img.cloudinaryPublicId !== publicId));
  }

  return (
    <div className="space-y-2">
      {label && <p className="onboarding-label">{label}</p>}
      <div className="grid grid-cols-3 gap-2">
        {slotImages.map((img) => (
          <div
            key={img.cloudinaryPublicId}
            className="group relative aspect-square overflow-hidden rounded-sm border border-border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.cloudinaryUrl}
              alt=""
              className="size-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeImage(img.cloudinaryPublicId)}
              aria-label="Remove photo"
              className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition-opacity"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {slotImages.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-border text-[var(--text-tertiary)] transition-colors duration-150",
              "hover:border-gold hover:text-gold"
            )}
          >
            {uploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <ImagePlus className="size-5" strokeWidth={1.75} />
                <span className="text-xs">Add photo</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
