"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { WebsitePreviewSkeleton } from "@/components/ui/skeleton";

/**
 * True full-viewport preview — no device toggle, no scaled stage, no
 * dashboard chrome. Just the live site at 100% of the real screen with a
 * single back button to return to the studio.
 */
export function FullScreenPreview({
  handle,
  refreshKey,
}: {
  handle: string;
  refreshKey: string;
}) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const onLoad = useCallback(() => setLoaded(true), []);

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/website");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex h-dvh w-dvw flex-col bg-background">
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border-solid)] bg-background/95 px-3 py-2.5 backdrop-blur">
        <button
          type="button"
          onClick={goBack}
          className="flex shrink-0 items-center gap-1 rounded-sm px-2 py-1.5 text-sm font-medium text-foreground transition-colors [transition-duration:var(--transition-fast)] hover:bg-[var(--bg-elevated)]"
          aria-label="Back to studio"
        >
          <ChevronLeft className="size-4" /> Back
        </button>
        <span className="min-w-0 flex-1 truncate text-center text-sm font-medium text-muted-foreground">
          {handle}
        </span>
        {/* Spacer to balance the back button so the site name stays centered */}
        <span className="w-[52px] shrink-0" aria-hidden />
      </div>
      <div className="relative min-h-0 flex-1">
        {!loaded && (
          <div className="absolute inset-0 z-10">
            <WebsitePreviewSkeleton className="h-full rounded-none border-0" />
          </div>
        )}
        <iframe
          title="Website preview"
          src={`/preview/${handle}?v=${refreshKey}`}
          onLoad={onLoad}
          className="h-full w-full border-0 bg-[var(--bg-secondary)] transition-opacity duration-300"
          style={{ opacity: loaded ? 1 : 0 }}
          // See PreviewFrame.tsx — allow-same-origin intentionally omitted.
          sandbox="allow-scripts allow-forms"
        />
      </div>
    </div>
  );
}
