"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { safeFetchJSON, FetchError } from "@/lib/utils/safe-fetch";
import { ZuriSpinner } from "@/components/ui/skeleton";

export interface ApplyUploadedImage {
  publicId: string;
  url: string;
}

interface ApplyUploadZoneProps {
  images: ApplyUploadedImage[];
  onChange: (images: ApplyUploadedImage[]) => void;
  maxImages: number;
  label?: string;
}

/**
 * Agency-apply asset upload — same UX as PhotoUploadZone, hits the public
 * /api/agencies/apply/upload route (no onboarding session token).
 */
export function ApplyUploadZone({
  images,
  onChange,
  maxImages,
  label,
}: ApplyUploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke only on unmount
  }, []);

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
    if (images.length >= maxImages) {
      setError(
        `You can upload up to ${maxImages} image${maxImages === 1 ? "" : "s"}.`
      );
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    setUploading(true);

    try {
      const form = new FormData();
      form.append("file", file);

      const result = await safeFetchJSON<{
        publicId?: string;
        url?: string;
      }>("/api/agencies/apply/upload", {
        method: "POST",
        body: form,
        timeoutMs: 60_000,
      });

      if (!result.url || !result.publicId) {
        throw new FetchError(
          "Upload completed but the image URL was missing. Please try again.",
          500
        );
      }

      if (!cancelledRef.current) {
        onChange([...images, { publicId: result.publicId, url: result.url }]);
      }
    } catch (err) {
      if (!cancelledRef.current) {
        setError(
          err instanceof FetchError
            ? err.message
            : "Upload failed. Please try again."
        );
      }
    } finally {
      URL.revokeObjectURL(objectUrl);
      if (!cancelledRef.current) {
        setLocalPreview(null);
        setUploading(false);
      }
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeImage(publicId: string) {
    onChange(images.filter((img) => img.publicId !== publicId));
    setError(null);
  }

  function handleImageError(publicId: string) {
    onChange(images.filter((img) => img.publicId !== publicId));
    setError("Could not display that image. Please try uploading again.");
  }

  return (
    <div className="space-y-2">
      {label && <p className="onboarding-label">{label}</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {images.map((img) => (
          <div
            key={img.publicId}
            className="group relative aspect-square overflow-hidden rounded-sm border border-border bg-[var(--bg-secondary)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt=""
              className="size-full object-cover"
              onError={() => handleImageError(img.publicId)}
            />
            <button
              type="button"
              onClick={() => removeImage(img.publicId)}
              aria-label="Remove photo"
              className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition-opacity"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {localPreview && uploading && (
          <div className="relative aspect-square overflow-hidden rounded-sm border border-border bg-[var(--bg-secondary)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={localPreview}
              alt=""
              className="size-full object-cover opacity-60"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <ZuriSpinner size={20} label="Uploading" />
            </div>
          </div>
        )}

        {images.length < maxImages && !uploading && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-border text-[var(--text-tertiary)] transition-colors duration-150",
              "hover:border-gold hover:text-gold"
            )}
          >
            <ImagePlus className="size-5" strokeWidth={1.75} />
            <span className="text-xs">Add photo</span>
          </button>
        )}

        {images.length < maxImages && uploading && !localPreview && (
          <div className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-border">
            <ZuriSpinner size={20} label="Uploading" />
          </div>
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
            onClick={() => {
              setError(null);
              inputRef.current?.click();
            }}
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
