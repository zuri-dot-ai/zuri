export type ImageAspectRatio = "1:1" | "4:5" | "16:9" | "9:16" | "3:4";

export function getAspectRatio(
  platform: string,
  formatType: string
): ImageAspectRatio {
  const map: Record<string, Record<string, string>> = {
    instagram: {
      static_image: "4:5",
      carousel: "1:1",
      story: "9:16",
      reel: "9:16",
    },
    facebook: {
      static_image: "1:1",
      story: "9:16",
      default: "16:9",
    },
    linkedin: {
      static_image: "1:1",
      article: "16:9",
      default: "16:9",
    },
    x: {
      static_image: "16:9",
      default: "1:1",
    },
    tiktok: {
      short_video: "9:16",
    },
  };

  return (map[platform]?.[formatType] ??
    map[platform]?.["default"] ??
    "1:1") as ImageAspectRatio;
}

export function getPixelDimensions(aspectRatio: string): {
  width: number;
  height: number;
} {
  const dimensions: Record<string, { width: number; height: number }> = {
    "1:1": { width: 1080, height: 1080 },
    "4:5": { width: 1080, height: 1350 },
    "16:9": { width: 1200, height: 675 },
    "9:16": { width: 1080, height: 1920 },
    "3:4": { width: 1080, height: 1440 },
  };
  return dimensions[aspectRatio] ?? { width: 1080, height: 1080 };
}
