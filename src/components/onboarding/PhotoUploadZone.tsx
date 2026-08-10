// src/components/onboarding/PhotoUploadZone.tsx
"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { safeFetchJSON, FetchError } from "@/lib/utils/safe-fetch";
import { ZuriSpinner } from "@/components/ui/skeleton";
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

    if (!sessionToken) {
      setError("Upload session isn't ready yet. Please wait a moment and try again.");
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
        timeoutMs: 60_000,
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
      setError(
        err instanceof FetchError
          ? err.message
          : "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeImage(publicId: string) {
    onChange(images.filter((img) => img.cloudinaryPublicId !== publicId));
  }

  function retryUpload() {
    setError(null);
    inputRef.current?.click();
  }

  return (
    <div className="space-y-2">
      {label && (
        // Gold uppercase kicker — same "EmailEyebrow" / section-header
        // pattern used in the website editor and content calendar, so
        // "Before"/"After" reads as a designed label, not plain gray text.
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold/80">
          {label}
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {slotImages.map((img) => (
          <div
            key={img.cloudinaryPublicId}
            className="group relative aspect-square overflow-hidden rounded-sm border border-[var(--border-solid)]"
          >
            <img
              src={img.cloudinaryUrl}
              alt=""
              className="size-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeImage(img.cloudinaryPublicId)}
              aria-label="Remove photo"
              className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition-transform active:scale-90"
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
              // Was `border-border` — the shadcn neutral bridge token,
              // not the app's gold-tinted design-system border. That was
              // the actual bug: this box was never wired into the same
              // "premium" token set every other card/panel in the app
              // uses, so it looked like an unstyled default even though
              // technically nothing was missing.
              "group/zone flex aspect-square flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-[var(--border-solid)] bg-[var(--bg-elevated)]/40 transition-all [transition-duration:var(--transition-fast)] active:scale-[0.97]",
              "hover:border-gold hover:bg-gold/5",
              uploading && "pointer-events-none"
            )}
          >
            {uploading ? (
              <ZuriSpinner size={20} label="Uploading" />
            ) : (
              <>
                {/* Icon badge — visible at rest, not just on hover. The
                    old version only turned gold on :hover, which meant it
                    never showed as gold at all on touch devices (no
                    hover state), so every mobile user only ever saw the
                    flat gray version. */}
                <span className="flex size-9 items-center justify-center rounded-md bg-gold/10 text-gold transition-colors [transition-duration:var(--transition-fast)] group-hover/zone:bg-gold/15">
                  <ImagePlus className="size-4" strokeWidth={1.75} />
                </span>
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  Add photo
                </span>
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
      {error && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-error">{error}</p>
          <button
            type="button"
            onClick={retryUpload}
            disabled={uploading}
            className="text-sm font-medium text-gold underline-offset-2 hover:underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
