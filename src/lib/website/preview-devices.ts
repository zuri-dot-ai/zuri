/** Fixed intrinsic widths for the website studio device preview. */

export type PreviewDevice = "desktop" | "tablet" | "mobile";

export const DEVICE_WIDTHS: Record<PreviewDevice, number> = {
  desktop: 1440,
  tablet: 768,
  mobile: 375,
};

/** Fraction of the preview pane width each device frame should occupy. */
export const DEVICE_PANE_FRACTIONS: Record<PreviewDevice, number> = {
  desktop: 1,
  tablet: 0.8,
  mobile: 0.5,
};

/** Tall enough for a full page scroll inside the iframe stage. */
export const DEVICE_STAGE_HEIGHT = 1024;

export function defaultPreviewDevice(): PreviewDevice {
  if (typeof window === "undefined") return "desktop";
  return window.matchMedia("(max-width: 1023px)").matches ? "mobile" : "desktop";
}

/** Scale so the frame fills `paneFraction` of available width (height may scroll). */
export function computePreviewScale(
  availableWidth: number,
  intrinsicWidth: number,
  paneFraction: number
): number {
  if (availableWidth <= 0 || intrinsicWidth <= 0) return 1;
  const targetWidth = availableWidth * paneFraction;
  return targetWidth / intrinsicWidth;
}
