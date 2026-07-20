"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CategoryImageRow, DesignArchetype, ResolvedImage } from "@/types/website";
import { formatFieldLabel } from "@/lib/website/field-groups";

function SlotCard({
  slot,
  image,
  archetype,
  onUpdated,
}: {
  slot: string;
  image?: ResolvedImage;
  archetype: DesignArchetype | null;
  onUpdated: (slot: string, image: ResolvedImage) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [library, setLibrary] = useState<CategoryImageRow[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.set("slot", slot);
      form.set("action", "upload");
      form.set("file", file);
      const res = await fetch("/api/website/image", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onUpdated(slot, data.image);
      toast.success(`${formatFieldLabel(slot)} updated`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function openLibrary() {
    setLibraryOpen(true);
    setLoadingLibrary(true);
    try {
      const params = new URLSearchParams({ slot });
      if (archetype) params.set("archetype", archetype);
      const res = await fetch(`/api/website/image?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load library");
      setLibrary(data.images ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Library unavailable");
      setLibrary([]);
    } finally {
      setLoadingLibrary(false);
    }
  }

  async function pickCurated(id: string) {
    setBusy(true);
    try {
      const form = new FormData();
      form.set("slot", slot);
      form.set("action", "curated_pick");
      form.set("curatedId", id);
      const res = await fetch("/api/website/image", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Pick failed");
      onUpdated(slot, data.image);
      setLibraryOpen(false);
      toast.success(`${formatFieldLabel(slot)} updated`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pick failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-sm border border-border bg-background p-4">
      <div className="flex gap-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-sm border border-border bg-surface">
          {image?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image.url} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
              Empty
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium capitalize">
            {slot.replace(/_/g, " ")}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {image?.source ?? "No image set"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="mr-1 size-3.5" />
              Upload
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={openLibrary}
            >
              <Library className="mr-1 size-3.5" />
              Library
            </Button>
          </div>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />

      {libraryOpen && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground">
            Curated library
          </p>
          {loadingLibrary ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : library.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No curated images yet for this slot. Upload your own instead.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {library.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  disabled={busy}
                  onClick={() => pickCurated(row.id)}
                  className="aspect-square overflow-hidden rounded-sm border border-border hover:border-gold"
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
  );
}

export function ImagesPanel({
  filledImages,
  imageSlots,
  archetype,
  onUpdated,
}: {
  filledImages: Record<string, ResolvedImage>;
  imageSlots: string[];
  archetype: DesignArchetype | null;
  onUpdated: (slot: string, image: ResolvedImage) => void;
}) {
  const slots =
    imageSlots.length > 0 ? imageSlots : Object.keys(filledImages);

  if (slots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No image slots found for this template.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {slots.map((slot) => (
        <SlotCard
          key={slot}
          slot={slot}
          image={filledImages[slot]}
          archetype={archetype}
          onUpdated={onUpdated}
        />
      ))}
    </div>
  );
}
