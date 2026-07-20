"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Upload, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CATEGORY_SLOT_TYPES,
  DESIGN_ARCHETYPES,
  type CategorySlotType,
} from "@/lib/website/category-images";
import type { DesignArchetype } from "@/lib/website/archetypes";
import type { CategoryImageRow } from "@/types/website";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";

const selectClassName =
  "flex h-11 w-full rounded-none border border-[hsl(var(--input))] bg-[hsl(var(--surface-form))] px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:border-gold";

export function CategoryImagesUploader() {
  const [archetype, setArchetype] = useState<DesignArchetype>("warm-sensory");
  const [slotType, setSlotType] = useState<CategorySlotType>("hero");
  const [tags, setTags] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<CategoryImageRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const previewUrls = useMemo(
    () => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [files]
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previewUrls]);

  const refresh = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await safeFetchJSON<{ images?: CategoryImageRow[] }>(
        "/api/admin/category-images?limit=48"
      );
      setImages(data.images ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load library");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) {
      toast.error("Choose at least one image.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.set("archetype", archetype);
      form.set("slot_type", slotType);
      form.set("tags", tags);
      for (const file of files) {
        form.append("files", file);
      }

      const data = await safeFetchJSON<{
        count?: number;
        failures?: { name: string; error: string }[];
        error?: string;
      }>("/api/admin/category-images", {
        method: "POST",
        body: form,
      });

      const ok = data.count ?? 0;
      const fail = (data.failures ?? []).length;

      if (ok > 0) {
        toast.success(
          fail > 0
            ? `Uploaded ${ok} image(s); ${fail} failed.`
            : `Uploaded ${ok} image(s).`
        );
      } else {
        toast.error(
          data.failures?.[0]?.error ?? data.error ?? "Upload failed"
        );
      }

      if (fail > 0) {
        for (const f of (data.failures ?? []).slice(0, 5)) {
          toast.error(`${f.name}: ${f.error}`);
        }
      }

      setFiles([]);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-3xl font-semibold tracking-tight">
          Category images
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Manually curated library for template image slots. Uploads go to the{" "}
          <code className="text-foreground">category-images</code> bucket at{" "}
          <code className="text-foreground">[archetype]/[slot_type]/</code>{" "}
          with a matching <code className="text-foreground">category_images</code>{" "}
          row. Same archetype + slot applies to the whole batch.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bulk upload</CardTitle>
          <CardDescription>
            JPEG, PNG, or WebP · max 10MB each · up to 40 files per batch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="archetype">Archetype</Label>
                <select
                  id="archetype"
                  className={selectClassName}
                  value={archetype}
                  onChange={(e) =>
                    setArchetype(e.target.value as DesignArchetype)
                  }
                >
                  {DESIGN_ARCHETYPES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="slot_type">Slot type</Label>
                <select
                  id="slot_type"
                  className={selectClassName}
                  value={slotType}
                  onChange={(e) =>
                    setSlotType(e.target.value as CategorySlotType)
                  }
                >
                  {CATEGORY_SLOT_TYPES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (optional)</Label>
              <Input
                id="tags"
                placeholder="warm, food, closeup"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated. Applied to every file in this batch.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="files">Images</Label>
              <Input
                id="files"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) =>
                  setFiles(Array.from(e.target.files ?? []))
                }
              />
              {files.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {files.length} file(s) selected →{" "}
                  <code>
                    {archetype}/{slotType}/
                  </code>
                </p>
              )}
            </div>

            {previewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {previewUrls.map((p) => (
                  <div
                    key={p.url}
                    className="relative aspect-square overflow-hidden rounded-lg border border-border bg-background"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            <Button type="submit" disabled={uploading || files.length === 0}>
              {uploading ? (
                <>
                  <span className="zuri-spinner" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload />
                  Upload {files.length || ""} image
                  {files.length === 1 ? "" : "s"}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-heading text-xl font-semibold">Library</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={loadingList}
          >
            Refresh
          </Button>
        </div>

        {loadingList ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="zuri-spinner" /> Loading…
          </p>
        ) : images.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ImageIcon className="size-4" /> No images yet — upload a batch
            above.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {images.map((img) => (
              <article
                key={img.id}
                className="overflow-hidden rounded-lg border border-border bg-surface"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.public_url}
                  alt={`${img.archetype} ${img.slot_type}`}
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="space-y-1 p-3 text-xs">
                  <p className="font-medium text-foreground">
                    {img.archetype}
                  </p>
                  <p className="text-muted-foreground">{img.slot_type}</p>
                  {img.tags && img.tags.length > 0 && (
                    <p className="truncate text-muted-foreground">
                      {img.tags.join(", ")}
                    </p>
                  )}
                  <p className="truncate font-mono text-[10px] text-muted-foreground">
                    {img.storage_path}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
