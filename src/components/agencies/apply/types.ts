import type { AgencyService } from "@/lib/agencies/types";

export const AGENCY_APPLY_TOTAL_STEPS = 5;

export interface AgencyApplyFormState {
  agencyName: string;
  locationId: string;
  locationCityOther: string;
  website: string;
  primaryService: AgencyService | null;
  secondaryServices: AgencyService[];
  description: string;
  email: string;
  whatsapp: string;
  priceRange: "budget" | "mid" | "premium" | null;
  logoUrl: string | null;
  logoPublicId: string | null;
  portfolioImages: { publicId: string; url: string }[];
}

export const DEFAULT_AGENCY_APPLY_STATE: AgencyApplyFormState = {
  agencyName: "",
  locationId: "",
  locationCityOther: "",
  website: "",
  primaryService: null,
  secondaryServices: [],
  description: "",
  email: "",
  whatsapp: "",
  priceRange: null,
  logoUrl: null,
  logoPublicId: null,
  portfolioImages: [],
};

const LOCATION_LABELS: Record<string, string> = {
  lagos: "Lagos",
  abuja: "Abuja",
  "port-harcourt": "Port Harcourt",
  ibadan: "Ibadan",
  kano: "Kano",
  nationwide: "Nationwide",
  international: "International",
};

/** Resolve city pill selection to the string stored in location_city. */
export function resolveLocationCity(state: AgencyApplyFormState): string {
  if (state.locationId === "other-city") {
    return state.locationCityOther.trim();
  }
  return LOCATION_LABELS[state.locationId] ?? state.locationId;
}

/** Ensure website has a protocol before URL validation. */
export function normalizeWebsiteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
