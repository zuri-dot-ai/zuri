"use client";

import { useCallback, useState } from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export function PreviewFrame({
  handle,
  refreshKey,
  rootDomain,
}: {
  handle: string | null;
  refreshKey: number;
  rootDomain: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const previewSrc = handle ? `/preview/${handle}?v=${refreshKey}` : null;

  const onLoad = useCallback(() => setLoaded(true), []);

  return (
    <div className="surface-hairline flex h-full min-h-[60vh] flex-col overflow-hidden border border-border reveal-preview md:min-h-0">
      <div className="flex items-center gap-2 border-b border-border bg-background px-4 py-2.5">
        <Globe className="size-4 text-muted-foreground" />
        <span className="font-mono text-xs text-muted-foreground">
          {handle ? `${handle}.${rootDomain}` : "preview"}
        </span>
      </div>
      <div className="relative flex-1 bg-white">
        {!loaded && previewSrc && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <span className="zuri-spinner" />
          </div>
        )}
        {previewSrc ? (
          <iframe
            key={refreshKey}
            title="Website preview"
            src={previewSrc}
            onLoad={onLoad}
            className={cn(
              "h-full w-full border-0 bg-white",
              !loaded && "opacity-0"
            )}
            sandbox="allow-scripts allow-same-origin allow-forms"
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
