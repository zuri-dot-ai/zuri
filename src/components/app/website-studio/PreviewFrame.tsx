"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Globe, Monitor, Smartphone, Tablet } from "lucide-react";
import { cn } from "@/lib/utils";
import { WebsitePreviewSkeleton } from "@/components/ui/skeleton";
import {
  computePreviewScale,
  defaultPreviewDevice,
  DEVICE_STAGE_HEIGHT,
  DEVICE_WIDTHS,
  type PreviewDevice,
} from "@/lib/website/preview-devices";

const PREVIEW_MSG = "zuri-preview";

const DEVICE_TOGGLE: {
  id: PreviewDevice;
  label: string;
  icon: typeof Monitor;
}[] = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "mobile", label: "Mobile", icon: Smartphone },
];

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
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [scale, setScale] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const previewSrc = handle ? `/preview/${handle}?v=${refreshKey}` : null;

  const intrinsicWidth = DEVICE_WIDTHS[device];
  const intrinsicHeight = DEVICE_STAGE_HEIGHT;
  const compactChrome = device !== "desktop";
  const showDeviceFrame = device === "mobile" || device === "tablet";

  useEffect(() => {
    setDevice(defaultPreviewDevice());
  }, []);

  useEffect(() => {
    setLoaded(false);
  }, [refreshKey, handle]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const update = () => {
      const availW = el.clientWidth;
      const availH = el.clientHeight;
      // Leave a little padding so the frame isn't flush against edges
      const pad = showDeviceFrame ? 24 : 16;
      setScale(
        computePreviewScale(
          Math.max(0, availW - pad),
          Math.max(0, availH - pad),
          intrinsicWidth,
          intrinsicHeight
        )
      );
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [intrinsicWidth, intrinsicHeight, showDeviceFrame]);

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

  const onLoad = useCallback(() => {
    setLoaded(true);
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

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

  const scaledHeight = intrinsicHeight * scale;

  return (
    <div className="surface-hairline flex h-full min-h-[60vh] flex-col overflow-hidden border border-border reveal-preview md:min-h-0">
      {/* Mock browser chrome */}
      <div
        className={cn(
          "flex items-center gap-2 border-b border-border bg-background",
          compactChrome ? "px-3 py-1.5" : "px-4 py-2.5"
        )}
      >
        <Globe
          className={cn(
            "shrink-0 text-muted-foreground",
            compactChrome ? "size-3.5" : "size-4"
          )}
        />
        <span
          className={cn(
            "min-w-0 flex-1 truncate font-mono text-muted-foreground",
            compactChrome ? "text-[10px]" : "text-xs"
          )}
        >
          {handle ? `${handle}.${rootDomain}` : "preview"}
        </span>
        <div
          className="flex shrink-0 items-center gap-0.5 rounded-sm border border-border p-0.5"
          role="group"
          aria-label="Preview device size"
        >
          {DEVICE_TOGGLE.map(({ id, label, icon: Icon }) => {
            const active = device === id;
            return (
              <button
                key={id}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={active}
                onClick={() => setDevice(id)}
                className={cn(
                  "rounded-sm p-1.5 transition-colors",
                  active
                    ? "bg-surface text-gold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Scale-to-fit viewport */}
      <div
        ref={viewportRef}
        className="relative flex min-h-0 flex-1 items-start justify-center overflow-auto bg-[var(--bg-secondary)]"
      >
        {!loaded && previewSrc && (
          <div className="absolute inset-0 z-10">
            <WebsitePreviewSkeleton className="h-full rounded-none border-0" />
          </div>
        )}

        {previewSrc ? (
          <div
            className="relative mx-auto transition-[width,height] duration-[220ms] ease-out"
            style={{
              width: intrinsicWidth * scale,
              height: scaledHeight,
            }}
          >
            <div
              className="absolute left-1/2 top-0 origin-top transition-transform duration-[220ms] ease-out"
              style={{
                width: intrinsicWidth,
                height: intrinsicHeight,
                transform: `translateX(-50%) scale(${scale})`,
              }}
            >
              <div
                className={cn(
                  "h-full w-full overflow-hidden bg-[var(--bg-secondary)]",
                  showDeviceFrame &&
                    (device === "mobile"
                      ? "rounded-[1.25rem] border border-border p-1.5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                      : "rounded-xl border border-border p-1.5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]")
                )}
              >
                <iframe
                  ref={iframeRef}
                  key={refreshKey}
                  title="Website preview"
                  src={previewSrc}
                  onLoad={onLoad}
                  width={intrinsicWidth}
                  height={intrinsicHeight}
                  className={cn(
                    "block border-0 bg-[var(--bg-secondary)] transition-opacity duration-300",
                    showDeviceFrame &&
                      (device === "mobile" ? "rounded-[1rem]" : "rounded-lg"),
                    loaded ? "opacity-100" : "opacity-0"
                  )}
                  style={{
                    width: intrinsicWidth,
                    height: intrinsicHeight,
                  }}
                  // No `allow-same-origin`: the preview document is a normal
                  // same-URL response (not srcDoc), so combining it with
                  // allow-scripts would let injected/AI-generated site
                  // content script its way into this origin's storage/
                  // cookies. Scripted communication back to the studio only
                  // needs postMessage, which works fine without it.
                  sandbox="allow-scripts allow-forms"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Preview unavailable
          </div>
        )}
      </div>
    </div>
  );
}
