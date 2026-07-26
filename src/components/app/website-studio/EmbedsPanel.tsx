"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Code2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";
import { MAX_EMBEDS } from "@/lib/website/embed-sanitize";
import type { ResolvedEmbed } from "@/types/website";

const PROVIDER_LABEL: Record<ResolvedEmbed["provider"], string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  google_maps: "Google Maps",
  iframe: "Embed",
};

export function EmbedsPanel({
  embeds,
  onChange,
}: {
  embeds: ResolvedEmbed[];
  onChange: (embeds: ResolvedEmbed[], needsReview?: boolean) => void;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function addEmbed() {
    if (!input.trim()) return;
    setBusy(true);
    try {
      const data = await safeFetchJSON<{
        filledEmbeds: ResolvedEmbed[];
        needsReview?: boolean;
      }>("/api/website/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      onChange(data.filledEmbeds, data.needsReview);
      setInput("");
      toast.success("Embed added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add embed");
    } finally {
      setBusy(false);
    }
  }

  async function removeEmbed(id: string) {
    setBusy(true);
    try {
      const data = await safeFetchJSON<{
        filledEmbeds: ResolvedEmbed[];
        needsReview?: boolean;
      }>("/api/website/embed", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      onChange(data.filledEmbeds, data.needsReview);
      toast.success("Embed removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove embed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-card-body">
        Add a YouTube or Vimeo video, Google Maps location, or paste an iframe
        embed from Calendly, Google Forms, Eventbrite, and similar tools.
      </p>

      {embeds.length > 0 && (
        <ul className="space-y-2">
          {embeds.map((embed) => (
            <li
              key={embed.id}
              className="content-card flex items-start gap-3 p-3"
            >
              <Code2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-card-title">
                  {PROVIDER_LABEL[embed.provider]}
                </p>
                <p className="truncate text-card-meta">{embed.src}</p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void removeEmbed(embed.id)}
                className="rounded-sm p-1.5 text-muted-foreground hover:text-destructive"
                aria-label="Remove embed"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {embeds.length < MAX_EMBEDS ? (
        <div className="space-y-2">
          <label className="block space-y-1.5">
            <span className="text-label">URL or embed code</span>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={4}
              placeholder="https://www.youtube.com/watch?v=… or <iframe …>"
              className="w-full resize-y rounded-sm border border-[var(--border-solid)] bg-background px-3 py-2 font-mono text-xs outline-none focus:border-gold"
            />
          </label>
          <Button
            size="sm"
            disabled={busy || !input.trim()}
            onClick={() => void addEmbed()}
          >
            <Plus className="size-4" />
            {busy ? "Adding…" : "Add embed"}
          </Button>
          <p className="text-card-meta">
            {embeds.length}/{MAX_EMBEDS} embeds used
          </p>
        </div>
      ) : (
        <p className="text-card-meta">
          Maximum of {MAX_EMBEDS} embeds reached. Remove one to add another.
        </p>
      )}
    </div>
  );
}
