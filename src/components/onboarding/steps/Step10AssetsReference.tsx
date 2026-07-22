"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageUp, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sanitizeText } from "@/lib/utils/sanitize";

interface Step10AssetsReferenceProps {
  logoUrl: string;
  socialHandle: string;
  referenceUrl: string;
  onLogoUrlChange: (value: string) => void;
  onSocialHandleChange: (value: string) => void;
  onReferenceUrlChange: (value: string) => void;
  onValidityChange: (valid: boolean) => void;
}

function isPlausibleUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(
      value.startsWith("http") ? value : `https://${value}`
    );
    return Boolean(url.hostname.includes("."));
  } catch {
    return false;
  }
}

export function Step10AssetsReference({
  logoUrl,
  socialHandle,
  referenceUrl,
  onLogoUrlChange,
  onSocialHandleChange,
  onReferenceUrlChange,
  onValidityChange,
}: Step10AssetsReferenceProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // All fields optional — step is always valid.
  useEffect(() => {
    onValidityChange(true);
  }, [onValidityChange]);

  const urlValid = isPlausibleUrl(referenceUrl);

  const uploadFile = useCallback(
    async (file: File) => {
      setUploadError(null);
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        setUploadError("Please upload a PNG, JPG, or WebP image.");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setUploadError("Logo must be smaller than 2MB.");
        return;
      }
      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/onboarding/logo-upload", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        onLogoUrlChange(data.logoUrl);
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Upload failed. Try again."
        );
      } finally {
        setUploading(false);
      }
    },
    [onLogoUrlChange]
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="onboarding-headline">A few finishing touches</h1>
        <p className="onboarding-subtext">
          All optional — you can always add these later in Settings.
        </p>
      </div>

      <section className="space-y-4">
        <p className="onboarding-eyebrow">Logo</p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void uploadFile(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
          }}
          className={cn(
            "onboarding-panel flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 border-dashed text-center transition-colors duration-150",
            dragOver && "border-gold bg-gold/[0.06]"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
            }}
          />
          {uploading ? (
            <Loader2 className="size-6 animate-spin text-gold" />
          ) : logoUrl ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt="Uploaded logo"
                className="size-14 rounded-sm border border-border object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLogoUrlChange("");
                }}
                className="rounded-sm p-1.5 text-[var(--text-tertiary)] transition-colors hover:text-foreground"
                aria-label="Remove logo"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <>
              <ImageUp className="size-6 text-[var(--text-tertiary)]" strokeWidth={1.75} />
              <p className="onboarding-helper">
                Drag & drop, or tap to upload (PNG/JPG/WebP, up to 2MB)
              </p>
            </>
          )}
        </div>
        {uploadError && <p className="text-sm text-error">{uploadError}</p>}
        <p className="onboarding-helper">Add later in Settings if you skip this.</p>
      </section>

      <section className="space-y-4">
        <p className="onboarding-eyebrow">Social handle</p>
        <div className="onboarding-panel">
          <Input
            value={socialHandle}
            onChange={(e) => onSocialHandleChange(sanitizeText(e.target.value))}
            placeholder="@yourbusiness"
            className="onboarding-input h-12"
          />
        </div>
      </section>

      <section className="space-y-4">
        <p className="onboarding-eyebrow">A website whose feel you like?</p>
        <div className="onboarding-panel space-y-2">
          <Input
            value={referenceUrl}
            onChange={(e) => onReferenceUrlChange(e.target.value.trim())}
            placeholder="https://example.com"
            className="onboarding-input h-12"
          />
          {!urlValid && (
            <p className="text-sm text-error">
              That doesn&apos;t look like a valid URL.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
