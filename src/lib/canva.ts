/**
 * Build a Canva deep-link that opens pre-filtered templates.
 * Zero API cost — just a constructed URL.
 */
export function canvaDeepLink(searchTerm: string): string {
  const q = encodeURIComponent(searchTerm.trim());
  return `https://www.canva.com/create/social-media-graphics/?query=${q}`;
}