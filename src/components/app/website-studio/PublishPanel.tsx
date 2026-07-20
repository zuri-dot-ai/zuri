"use client";

import { AlertCircle, CheckCircle2, ExternalLink, Rocket, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSiteUrlMode } from "@/lib/website/public-site-url";

export function PublishPanel({
  published,
  canPublish,
  needsReview,
  previewUrl,
  liveUrl,
  busy,
  onPublish,
  onUnpublish,
  onUpgrade,
}: {
  published: boolean;
  canPublish: boolean;
  needsReview: boolean;
  previewUrl: string | null;
  liveUrl: string | null;
  busy: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
  onUpgrade: () => void;
}) {
  const urlMode = getSiteUrlMode();
  const publishLabel =
    urlMode === "path" ? "Publish live" : "Publish to subdomain";

  const checks = [
    {
      ok: !needsReview,
      label: needsReview
        ? "Content needs review before publishing"
        : "Content validation passed",
    },
    {
      ok: true,
      label: "Preview link ready",
    },
    {
      ok: canPublish || published,
      label: canPublish
        ? "Pro plan — publish enabled"
        : "Upgrade to Pro to go live",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {checks.map((c) => (
          <div key={c.label} className="flex items-start gap-2 text-sm">
            {c.ok ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            )}
            <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>
              {c.label}
            </span>
          </div>
        ))}
      </div>

      {urlMode === "path" && (
        <p className="text-xs text-muted-foreground">
          Live sites are public at{" "}
          <span className="font-mono">/sites/your-handle</span> until your custom
          domain wildcard is configured.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {previewUrl && !published && (
          <Button variant="outline" asChild>
            <a href={previewUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> Open preview
            </a>
          </Button>
        )}
        {liveUrl && published && (
          <Button variant="outline" asChild>
            <a href={liveUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> Visit live site
            </a>
          </Button>
        )}
        {published && canPublish ? (
          <Button
            variant="outline"
            onClick={onUnpublish}
            disabled={busy}
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            {busy ? (
              <>
                <span className="zuri-spinner" />
                <span className="ml-1 text-xs">Working…</span>
              </>
            ) : (
              <Undo2 className="size-4" />
            )}
            Unpublish
          </Button>
        ) : (
          <Button
            onClick={canPublish ? onPublish : onUpgrade}
            disabled={busy}
          >
            {busy ? (
              <>
                <span className="zuri-spinner" />
                <span className="ml-1 text-xs">Publishing…</span>
              </>
            ) : (
              <Rocket className="size-4" />
            )}
            {canPublish ? publishLabel : "Upgrade to publish"}
          </Button>
        )}
      </div>

      {published && liveUrl && (
        <Badge variant="success" className="font-normal">
          Live at {liveUrl.replace(/^https?:\/\//, "")}
        </Badge>
      )}
    </div>
  );
}
