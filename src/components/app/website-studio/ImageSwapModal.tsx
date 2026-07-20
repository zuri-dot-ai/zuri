"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { toast } from "sonner";
import { ImagePlus, Library, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";
import { getSlotAspectRatio } from "@/lib/website/slot-aspect";
import {
  compressImageForUpload,
  cropImageToFile,
} from "@/lib/website/compress-image";
import { formatFieldLabel } from "@/lib/website/field-groups";
import type {
  CategoryImageRow,
  DesignArchetype,
  ResolvedImage,
} from "@/types/website";

type Tab = "upload" | "library";

export function ImageSwapModal({
  slot,
  archetype,
  open,
  onClose,
  onUpdated,
}: {
  slot: string;
  archetype: DesignArchetype | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (slot: string, image: ResolvedImage, needsReview?: boolean) => void;
}) {
  const [tab, setTab] = useState<Tab>("upload");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  // Crop state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  // Library
  const [library, setLibrary] = useState<CategoryImageRow[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [tagFilter, setTagFilter] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const aspect = getSlotAspectRatio(slot);

  useEffect(() => {
    if (!open) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setError(null);
      setProgress(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedArea(null);
      setTagFilter("");
      setTab("upload");
    }
  }, [open]);

  useEffect(() => {
    if (!open || tab !== "library") return;
    let cancelled = false;
    (async () => {
      setLoadingLibrary(true);
      setError(null);
      try {
        const params = new URLSearchParams({ slot });
        if (archetype) params.set("archetype", archetype);
        const data = await safeFetchJSON<{
          images?: CategoryImageRow[];
          debug?: { sampleUrls?: unknown[]; count?: number };
        }>(`/api/website/image?${params}`);
        // #region agent log
        fetch(
          "http://127.0.0.1:7419/ingest/076876bf-f6bf-42a9-9aff-97004d9bbbbe",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "21ff00",
            },
            body: JSON.stringify({
              sessionId: "21ff00",
              runId: "pre-fix",
              hypothesisId: "C",
              location: "ImageSwapModal.tsx:library",
              message: "library loaded client",
              data: {
                count: data.images?.length ?? 0,
                sampleUrls: data.debug?.sampleUrls ?? null,
                firstUrl: data.images?.[0]?.public_url ?? null,
              },
              timestamp: Date.now(),
            }),
          }
        ).catch(() => {});
        // #endregion
        if (!cancelled) setLibrary(data.images ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Library unavailable");
          setLibrary([]);
        }
      } finally {
        if (!cancelled) setLoadingLibrary(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, tab, slot, archetype]);

  const onCropComplete = useCallback((_: Area, cropped: Area) => {
    setCroppedArea(cropped);
  }, []);

  function onFileSelected(file: File) {
    setError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPEG, PNG, and WebP images are allowed.");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }

  async function commitUpload() {
    if (!previewUrl || !croppedArea) {
      setError("Adjust the crop before saving.");
      return;
    }
    setBusy(true);
    setError(null);
    setProgress("Cropping…");
    try {
      const cropped = await cropImageToFile(
        previewUrl,
        croppedArea,
        `${slot}.jpg`
      );
      setProgress("Compressing…");
      const compressed = await compressImageForUpload(cropped);
      setProgress("Uploading…");
      const form = new FormData();
      form.set("slot", slot);
      form.set("action", "upload");
      form.set("file", compressed);
      const res = await fetch("/api/website/image", {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => ({}))) as {
        image?: ResolvedImage;
        needsReview?: boolean;
        error?: string;
        debug?: Record<string, unknown>;
      };
      // #region agent log
      fetch("http://127.0.0.1:7419/ingest/076876bf-f6bf-42a9-9aff-97004d9bbbbe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "21ff00",
        },
        body: JSON.stringify({
          sessionId: "21ff00",
          runId: "post-fix",
          hypothesisId: "A",
          location: "ImageSwapModal.tsx:commitUpload",
          message: res.ok ? "upload ok" : "upload failed client",
          data: {
            status: res.status,
            error: data.error ?? null,
            debug: data.debug ?? null,
            slot,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      fetch("/api/debug-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "21ff00",
          runId: "post-fix",
          hypothesisId: "A",
          location: "ImageSwapModal.tsx:commitUpload",
          message: res.ok ? "upload ok" : "upload failed client",
          data: {
            status: res.status,
            error: data.error ?? null,
            debug: data.debug ?? null,
            slot,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (!res.ok) {
        const hint =
          data.debug && typeof data.debug === "object"
            ? ` [${JSON.stringify(data.debug)}]`
            : "";
        throw new Error((data.error ?? "Upload failed") + hint);
      }
      if (!data.image) throw new Error("Upload failed");
      onUpdated(slot, data.image, data.needsReview);
      toast.success(`${formatFieldLabel(slot)} updated`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function pickCurated(id: string) {
    setBusy(true);
    setError(null);
    setProgress("Applying…");
    try {
      const form = new FormData();
      form.set("slot", slot);
      form.set("action", "curated_pick");
      form.set("curatedId", id);
      const data = await safeFetchJSON<{
        image: ResolvedImage;
        needsReview?: boolean;
      }>("/api/website/image", { method: "POST", body: form });
      onUpdated(slot, data.image, data.needsReview);
      toast.success(`${formatFieldLabel(slot)} updated`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pick failed");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const filteredLibrary = library.filter((row) => {
    if (!tagFilter.trim()) return true;
    const q = tagFilter.toLowerCase();
    const tags = (row.tags ?? []).join(" ").toLowerCase();
    return tags.includes(q) || (row.public_url ?? "").toLowerCase().includes(q);
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-lg border border-border bg-background shadow-xl sm:rounded-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="font-heading text-lg text-foreground">
              Replace image
            </h2>
            <p className="text-xs text-muted-foreground capitalize">
              {slot.replace(/_/g, " ")} · {aspect.toFixed(2)}:1
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex border-b border-border">
          {(
            [
              { id: "upload" as const, label: "Upload", icon: Upload },
              { id: "library" as const, label: "Library", icon: Library },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
                tab === id
                  ? "border-b-2 border-gold text-gold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-3 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {progress && (
            <p className="mb-3 text-xs text-muted-foreground">{progress}</p>
          )}

          {tab === "upload" && (
            <div className="space-y-4">
              {!previewUrl ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) onFileSelected(f);
                  }}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border bg-surface/50 px-4 py-12 text-sm text-muted-foreground transition-colors hover:border-gold/50 hover:text-foreground"
                >
                  <ImagePlus className="size-8 text-gold/80" />
                  <span>Drag & drop or click to browse</span>
                  <span className="text-xs">JPEG, PNG, WebP · max 4MB</span>
                </button>
              ) : (
                <>
                  <div className="relative h-56 overflow-hidden rounded-sm bg-black">
                    <Cropper
                      image={previewUrl}
                      crop={crop}
                      zoom={zoom}
                      aspect={aspect}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                    />
                  </div>
                  <label className="flex items-center gap-3 text-xs text-muted-foreground">
                    Zoom
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.05}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="flex-1 accent-[var(--gold)]"
                    />
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        setPreviewUrl((prev) => {
                          if (prev) URL.revokeObjectURL(prev);
                          return null;
                        });
                      }}
                    >
                      Choose another
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={commitUpload}
                      className="flex-1"
                    >
                      {busy ? "Saving…" : "Save image"}
                    </Button>
                  </div>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFileSelected(f);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {tab === "library" && (
            <div className="space-y-3">
              <input
                type="search"
                placeholder="Filter by tag…"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm"
              />
              {loadingLibrary ? (
                <p className="text-sm text-muted-foreground">Loading library…</p>
              ) : filteredLibrary.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No curated images for this slot. Upload your own instead.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {filteredLibrary.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      disabled={busy}
                      onClick={() => pickCurated(row.id)}
                      className="aspect-square overflow-hidden rounded-sm border border-border transition-colors hover:border-gold"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={row.public_url}
                        alt=""
                        className="size-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
