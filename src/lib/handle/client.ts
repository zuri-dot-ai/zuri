export {
  generateHandle,
  generateHandleSuggestions,
  validateHandle,
  RESERVED_HANDLES,
  HANDLE_RULES,
} from "@/lib/handle/rules";

/**
 * Live input sanitizer — converts as the user types without blocking mid-edit
 * (does not strip a trailing hyphen the user may still be typing past).
 */
export function sanitizeHandleInput(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 30);
}
