/** Safe support reference for 500 errors — helps debugging without leaking internals. */
export function generateSupportRef(): string {
  return `ERR-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
}
