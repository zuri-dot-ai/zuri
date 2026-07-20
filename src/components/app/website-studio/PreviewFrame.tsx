"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
}: {
  handle: string | null;
  refreshKey: number;
  rootDomain: string;
  highlightSection?: string | null;
  onImageSlotClick?: (slot: string) => void;
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
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onImageSlotClick]);

  useEffect(() => {
    if (!loaded || !highlightSection || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      {
        source: PREVIEW_MSG,
        type: "highlight-section",
        sectionId: highlightSection,
      },
      window.location.origin
    );
  }, [highlightSection, loaded, refreshKey]);

  const onLoad = useCallback(() => {
    setLoaded(true);
    const win = iframeRef.current?.contentWindow;
    const doc = iframeRef.current?.contentDocument;
    if (!win || !doc) return;

    // Inject bridge for scroll/highlight + image clicks
    const script = doc.createElement("script");
    script.textContent = `
(function(){
  var SRC='${PREVIEW_MSG}';
  window.addEventListener('message', function(e){
    if(!e.data || e.data.source!==SRC) return;
    if(e.data.type==='highlight-section' && e.data.sectionId){
      var el=document.getElementById(e.data.sectionId);
      if(!el) return;
      el.scrollIntoView({behavior:'smooth',block:'start'});
      el.style.outline='2px solid #C9A84C';
      el.style.outlineOffset='4px';
      setTimeout(function(){ el.style.outline=''; el.style.outlineOffset=''; },1200);
    }
  });
  document.querySelectorAll('img[data-image-slot]').forEach(function(img){
    img.style.cursor='pointer';
    img.addEventListener('click', function(ev){
      ev.preventDefault();
      var slot=img.getAttribute('data-image-slot');
      if(slot) parent.postMessage({source:SRC,type:'image-click',slot:slot}, '*');
    });
  });
})();`;
    doc.documentElement.appendChild(script);
  }, []);

  return (
    <div className="surface-hairline flex h-full min-h-[60vh] flex-col overflow-hidden border border-border reveal-preview md:min-h-0">
      <div className="flex items-center gap-2 border-b border-border bg-background px-4 py-2.5">
        <Globe className="size-4 text-muted-foreground" />
        <span className="font-mono text-xs text-muted-foreground">
          {handle ? `${handle}.${rootDomain}` : "preview"}
        </span>
      </div>
      <div className="relative flex-1 bg-[var(--bg-secondary)]">
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
            onLoad={onLoad}
            className={cn(
              "h-full w-full border-0 bg-[var(--bg-secondary)] transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0"
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
