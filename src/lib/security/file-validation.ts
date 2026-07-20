const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
/** Platform body limit is ~4.5MB — keep app limit under that. */
export const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB
/** Client should compress below this before upload. */
export const CLIENT_MAX_UPLOAD_BYTES = Math.floor(3.5 * 1024 * 1024);

// Magic byte signatures for image validation
const MAGIC_BYTES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // "RIFF"
};

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
}

export async function validateUploadedFile(
  file: File
): Promise<FileValidationResult> {
  // 1. Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "File must be smaller than 4MB." };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty." };
  }

  // 2. Check declared MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      valid: false,
      error: "Only JPEG, PNG, and WebP images are allowed.",
    };
  }

  // 3. Verify magic bytes (prevent MIME type spoofing)
  const headerBytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const expectedBytes = MAGIC_BYTES[file.type];

  if (
    expectedBytes &&
    !expectedBytes.every((byte, i) => headerBytes[i] === byte)
  ) {
    return {
      valid: false,
      error:
        "File does not match the declared image type. Please upload a valid image.",
    };
  }

  // 4. Generate safe filename (UUID-based — never use original filename)
  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const sanitizedName = `${crypto.randomUUID()}.${extension}`;

  return { valid: true, sanitizedName };
}

// Safe upload path generator — prevents path traversal
export function generateStoragePath(
  userId: string,
  context: string,
  filename: string
): string {
  // Sanitize each component
  const safeUserId = userId.replace(/[^a-z0-9-]/gi, "");
  const safeContext = context.replace(/[^a-z0-9-_]/g, "").slice(0, 30);
  const safeFilename = filename.replace(/[^a-z0-9.-]/g, "").slice(0, 50);

  // Never allow .. or / in any component
  if (
    [safeUserId, safeContext, safeFilename].some(
      (s) => s.includes("..") || s.includes("/")
    )
  ) {
    throw new Error("Invalid storage path component");
  }

  return `${safeUserId}/${safeContext}/${safeFilename}`;
}
