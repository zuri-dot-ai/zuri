import { CLIENT_MAX_UPLOAD_BYTES } from "@/lib/security/file-validation";

/**
 * Compress / resize an image File client-side so uploads stay under the
 * platform body-size limit (~4.5MB). Returns a JPEG/WebP File.
 */
export async function compressImageForUpload(
  file: File,
  maxBytes = CLIENT_MAX_UPLOAD_BYTES
): Promise<File> {
  if (file.size <= maxBytes && file.type !== "image/png") {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const maxEdge = 1920;
  let { width, height } = bitmap;
  if (width > maxEdge || height > maxEdge) {
    const scale = maxEdge / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.85;
  let blob: Blob | null = await canvasToBlob(canvas, "image/jpeg", quality);

  while (blob && blob.size > maxBytes && quality > 0.4) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }

  // Still too big — shrink dimensions
  while (blob && blob.size > maxBytes && width > 640) {
    width = Math.round(width * 0.75);
    height = Math.round(height * 0.75);
    canvas.width = width;
    canvas.height = height;
    const ctx2 = canvas.getContext("2d");
    if (!ctx2) break;
    const bmp2 = await createImageBitmap(file);
    ctx2.drawImage(bmp2, 0, 0, width, height);
    bmp2.close();
    blob = await canvasToBlob(canvas, "image/jpeg", 0.75);
  }

  if (!blob) return file;

  const name = file.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality);
  });
}

/** Crop a data-URL / object-URL to a File using pixel crop from react-easy-crop. */
export async function cropImageToFile(
  imageSrc: string,
  crop: { x: number; y: number; width: number; height: number },
  fileName = "cropped.jpg"
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.width));
  canvas.height = Math.max(1, Math.round(crop.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not crop image");
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  const blob = await canvasToBlob(canvas, "image/jpeg", 0.9);
  if (!blob) throw new Error("Could not encode cropped image");
  return new File([blob], fileName, { type: "image/jpeg" });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for crop"));
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}
