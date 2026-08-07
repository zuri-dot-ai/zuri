"use client";

import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { WebsitePreviewSkeleton } from "@/components/ui/skeleton";

const PREVIEW_MSG = "zuri-preview";

export function PreviewFrame({
  handle,
  refreshKey,
  rootDomain,
  highlightSection,
  onImageSlotClick,
  onLinkSlotClick,
}: {
  handle: string | null;
  refreshKey: number;
  rootDomain: string;
  highlightSection?: string | null;
  onImageSlotClick?: (slot: string) => void;
  onLinkSlotClick?: (slot: string, href: string, label: string) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewSrc = handle ? `/preview/${handle}?v=${refreshKey}` : null;

  useEffect(() => {
    setLoaded(false);
  }, [refreshKey, handle]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.source !== PREVIEW_MSG) return;
      if (data.type === "image-click" && typeof data.slot === "string") {
        onImageSlotClick?.(data.slot);
      }
      if (data.type === "link-click" && typeof data.slot === "string") {
        onLinkSlotClick?.(
          data.slot,
          typeof data.href === "string" ? data.href : "",
          typeof data.label === "string" ? data.label : ""
        );
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onImageSlotClick, onLinkSlotClick]);

  useEffect(() => {
    if (!loaded || !highlightSection || !iframeRef.current?.contentWindow)
      return;
    iframeRef.current.contentWindow.postMessage(
      {
        source: PREVIEW_MSG,
        type: "highlight-section",
        sectionId: highlightSection,
      },
      window.location.origin
    );
  }, [highlightSection, loaded, refreshKey]);

  return (
    <div className="surface-hairline flex h-full min-h-[60vh] flex-col overflow-hidden border border-border md:min-h-0">
      {/* Mock browser chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-background px-4 py-2.5">
        <Globe className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
          {handle ? `${handle}.${rootDomain}` : "preview"}
        </span>
      </div>

      <div className="relative min-h-0 flex-1 bg-[var(--bg-secondary)]">
        {!loaded && previewSrc && (
          <div className="absolute inset-0 z-10">
            <WebsitePreviewSkeleton className="h-full rounded-none border-0" />
          </div>
        )}

        {previewSrc ? (
          <iframe
            ref={iframeRef}
            key={refreshKey}
            title="Website preview"
            src={previewSrc}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={cn(
              "block h-full w-full border-0 bg-[var(--bg-secondary)] transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0"
            )}
            // No `allow-same-origin`: the preview document is a normal
            // same-URL response (not srcDoc), so combining it with
            // allow-scripts would let injected/AI-generated site
            // content script its way into this origin's storage/
            // cookies. Scripted communication back to the studio only
            // needs postMessage, which works fine without it. Slot
            // click handlers are injected server-side via
            // injectStudioBridge in /preview.
            sandbox="allow-scripts allow-forms"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Preview unavailable
          </div>
        )}
      </div>
    </div>
  );
}
