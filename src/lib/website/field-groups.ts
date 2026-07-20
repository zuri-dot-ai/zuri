/** Group placeholder keys for the Website Studio content panel. */

export interface FieldGroup {
  id: string;
  label: string;
  fields: string[];
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

export function groupPlaceholderFields(
  keys: string[]
): FieldGroup[] {
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

export function fieldInputType(key: string): "text" | "email" | "tel" | "url" | "textarea" {
  if (/email/.test(key)) return "email";
  if (/phone|whatsapp/.test(key)) return "tel";
  if (/url|instagram|facebook|twitter|linkedin|tiktok|youtube|website/.test(key))
    return "url";
  if (/body|description|about|paragraph|bio/.test(key)) return "textarea";
  return "text";
}

export function formatFieldLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
