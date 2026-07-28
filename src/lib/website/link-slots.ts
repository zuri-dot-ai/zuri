/** Discover unique `data-link-slot` ids from stored/template HTML. */
export function discoverLinkSlots(html: string | null | undefined): string[] {
  if (!html) return [];
  const slots = new Set<string>();
  const re = /\bdata-link-slot=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[1]) slots.add(m[1]);
  }
  return [...slots].sort((a, b) => {
    const rank = (s: string) => {
      if (s === "cta_primary") return 0;
      if (s === "cta_secondary") return 1;
      if (s.startsWith("cta_")) return 2;
      if (s.startsWith("nav_")) return 3;
      return 4;
    };
    const d = rank(a) - rank(b);
    return d !== 0 ? d : a.localeCompare(b);
  });
}

export type LinkSlotsHealReason =
  | "ok"
  | "already_present"
  | "no_template_id"
  | "fetch_failed"
  | "storage_missing_slots"
  | "recompose_failed";

export function formatLinkSlotLabel(slot: string): string {
  if (slot === "cta_primary") return "Primary button";
  if (slot === "cta_secondary") return "Secondary button";
  if (slot.startsWith("cta_")) {
    return `Button ${slot.replace(/^cta_/, "").replace(/_/g, " ")}`;
  }
  if (slot.startsWith("nav_")) {
    return `Nav · ${slot.replace(/^nav_/, "").replace(/_/g, " ")}`;
  }
  return slot.replace(/_/g, " ");
}

export function isCtaLinkSlot(slot: string): boolean {
  return slot.startsWith("cta_");
}
