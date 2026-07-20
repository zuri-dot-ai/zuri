/** Fixed intrinsic widths for the website studio device preview. */

export type PreviewDevice = "desktop" | "tablet" | "mobile";

export const DEVICE_WIDTHS: Record<PreviewDevice, number> = {
  desktop: 1440,
  tablet: 768,
  mobile: 375,
};

/** Tall enough for a full page scroll inside the iframe stage. */
export const DEVICE_STAGE_HEIGHT = 1024;

export function defaultPreviewDevice(): PreviewDevice {
  if (typeof window === "undefined") return "desktop";
  return window.matchMedia("(max-width: 1023px)").matches ? "mobile" : "desktop";
}

export function computePreviewScale(
  availableWidth: number,
  availableHeight: number,
  intrinsicWidth: number,
  intrinsicHeight: number
): number {
  if (availableWidth <= 0 || availableHeight <= 0) return 1;
  const byWidth = availableWidth / intrinsicWidth;
  const byHeight = availableHeight / intrinsicHeight;
  return Math.min(1, byWidth, byHeight);
}
