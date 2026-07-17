// src/lib/website/archetypes.ts
// Design archetype category concept only — no block-registry fields (v2).

export type DesignArchetype =
  | "warm-sensory" // food, restaurant, bakery, catering
  | "authority-minimal" // consultant, lawyer, accountant, coach
  | "luxury-aspirational" // beauty, spa, salon, fashion
  | "editorial-bold" // retail, streetwear, creative agency
  | "clean-modern" // tech, SaaS, fintech, logistics
  | "portfolio-dramatic" // photography, videography, art, music
  | "community-vibrant" // fitness, gym, wellness, yoga
  | "trust-professional"; // medical, dental, pharmacy, real estate

// Deterministic — zero AI. Maps business_type + industry + services to archetype.
export function resolveArchetype(
  businessType: string,
  industry: string,
  services: string[],
  brandVibe: string
): DesignArchetype {
  const combined = `${businessType} ${industry} ${services.join(" ")}`.toLowerCase();

  if (/food|restaurant|bakery|cater|cake|chef|kitchen|cuisine|café|cafe/.test(combined))
    return "warm-sensory";
  if (/beauty|salon|spa|hair|nail|makeup|skin|fashion|luxury|jewel|perfume/.test(combined))
    return "luxury-aspirational";
  if (/gym|fitness|sport|wellness|yoga|trainer|health coach|crossfit/.test(combined))
    return "community-vibrant";
  if (/photo|video|music|art|creative|design|film|record|content creator/.test(combined))
    return "portfolio-dramatic";
  if (/retail|shop|store|streetwear|clothing|brand/.test(combined))
    return "editorial-bold";
  if (/tech|software|app|digital|startup|saas|fintech|logistics|developer/.test(combined))
    return "clean-modern";
  if (/medical|doctor|dental|pharmacy|clinic|hospital|therapist|optician/.test(combined))
    return "trust-professional";
  if (/consult|lawyer|legal|account|finance|coach|advisor|strategy|audit|real estate/.test(combined))
    return "authority-minimal";

  if (brandVibe === "elegant-luxurious") return "luxury-aspirational";
  if (brandVibe === "bold-vibrant" || brandVibe === "warm-friendly") return "editorial-bold";
  if (brandVibe === "clean-modern" || brandVibe === "creative-artistic") return "portfolio-dramatic";

  return "authority-minimal"; // final fallback
}
