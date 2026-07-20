/** Extended field grouping for accordion editor + per-item sub-cards. */

export interface FieldGroup {
  id: string;
  label: string;
  fields: string[];
}

export interface ItemSubCard {
  id: string;
  label: string;
  fields: string[];
  optional: boolean;
}

const GROUP_RULES: { id: string; label: string; test: (k: string) => boolean }[] =
  [
    { id: "hero", label: "Hero", test: (k) => /^hero_|^tagline$|^cta_primary/.test(k) },
    { id: "about", label: "About", test: (k) => /^about_/.test(k) },
    {
      id: "services",
      label: "Services",
      test: (k) => /^service_\d+_/.test(k),
    },
    {
      id: "testimonials",
      label: "Testimonials",
      test: (k) => /^testimonial_/.test(k),
    },
    {
      id: "faq",
      label: "FAQ",
      test: (k) => /^faq_/.test(k),
    },
    {
      id: "contact",
      label: "Contact",
      test: (k) =>
        /phone|email|address|whatsapp|location|opening|map/.test(k),
    },
    {
      id: "social",
      label: "Social",
      test: (k) => /instagram|facebook|twitter|linkedin|tiktok|youtube/.test(k),
    },
    { id: "business", label: "Business", test: (k) => /^business_/.test(k) },
  ];

export function groupPlaceholderFields(keys: string[]): FieldGroup[] {
  const assigned = new Set<string>();
  const groups: FieldGroup[] = [];

  for (const rule of GROUP_RULES) {
    const fields = keys.filter((k) => rule.test(k) && !assigned.has(k));
    fields.forEach((f) => assigned.add(f));
    if (fields.length) groups.push({ id: rule.id, label: rule.label, fields });
  }

  const rest = keys.filter((k) => !assigned.has(k) && k !== "active_theme");
  if (rest.length) {
    groups.push({ id: "other", label: "Other", fields: rest });
  }

  return groups;
}

/** Split service_N_*, testimonial_N_*, faq_N_* into per-item sub-cards. */
export function groupIntoItemCards(
  groupId: string,
  fields: string[]
): ItemSubCard[] | null {
  const prefix =
    groupId === "services"
      ? "service"
      : groupId === "testimonials"
        ? "testimonial"
        : groupId === "faq"
          ? "faq"
          : null;
  if (!prefix) return null;

  const byIndex = new Map<number, string[]>();
  for (const f of fields) {
    const m = f.match(new RegExp(`^${prefix}_(\\d+)_`));
    if (!m) continue;
    const n = Number(m[1]);
    const list = byIndex.get(n) ?? [];
    list.push(f);
    byIndex.set(n, list);
  }

  if (byIndex.size === 0) return null;

  const cards: ItemSubCard[] = [];
  const indices = [...byIndex.keys()].sort((a, b) => a - b);
  for (const n of indices) {
    const itemFields = byIndex.get(n)!;
    const titleKey = itemFields.find((f) => /_title$|_question$|_name$/.test(f));
    const hasContent = itemFields.some((f) => f); // presence in map
    cards.push({
      id: `${prefix}-${n}`,
      label:
        prefix === "faq"
          ? `FAQ ${n}`
          : prefix === "testimonial"
            ? `Testimonial ${n}`
            : `Service ${n}`,
      fields: itemFields,
      optional: n >= 4,
    });
    void titleKey;
    void hasContent;
  }
  return cards;
}

export function fieldInputType(
  key: string
): "text" | "email" | "tel" | "url" | "textarea" {
  if (/email/.test(key)) return "email";
  if (/phone|whatsapp/.test(key)) return "tel";
  if (
    /url|instagram|facebook|twitter|linkedin|tiktok|youtube|website/.test(key)
  )
    return "url";
  if (/body|description|about|paragraph|bio|answer|quote/.test(key))
    return "textarea";
  return "text";
}

export function formatFieldLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Map editor section id → template section element id for preview scroll. */
export function previewSectionId(groupId: string): string | null {
  const map: Record<string, string> = {
    hero: "hero",
    about: "about",
    services: "services",
    testimonials: "testimonials",
    faq: "faq",
    contact: "contact",
  };
  return map[groupId] ?? null;
}
