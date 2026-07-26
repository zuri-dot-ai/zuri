/** Custom Sites Premium Funnel — form + DB enums/labels. */

export const CUSTOM_SITE_TOTAL_STEPS = 5;
export const CUSTOM_SITE_TOTAL_STEPS_AUTHED = 4; // skips signup

export type CustomSiteProjectType =
  | "magazine-publication"
  | "ecommerce-store"
  | "membership-paywall"
  | "other-custom";

export type CustomSiteFeature =
  | "payment"
  | "inventory"
  | "multi-author-cms"
  | "subscriptions"
  | "user-accounts"
  | "custom-integrations"
  | "other";

export type CustomSiteBudgetRange =
  | "under_500k"
  | "500k_2m"
  | "2m_plus"
  | "not_sure";

export type CustomSiteTimeline =
  | "asap"
  | "1_month"
  | "1_3_months"
  | "flexible";

export type CustomSiteRequestStatus =
  | "pending"
  | "in_review"
  | "approved"
  | "declined";

export interface CustomSiteFormState {
  projectType: CustomSiteProjectType | "";
  description: string;
  features: CustomSiteFeature[];
  customIntegrationsText: string;
  otherFeaturesText: string;
  budgetRange: CustomSiteBudgetRange | "";
  timeline: CustomSiteTimeline | "";
  referenceUrl: string;
}

export const DEFAULT_CUSTOM_SITE_STATE: CustomSiteFormState = {
  projectType: "",
  description: "",
  features: [],
  customIntegrationsText: "",
  otherFeaturesText: "",
  budgetRange: "",
  timeline: "",
  referenceUrl: "",
};

export const PROJECT_TYPE_LABELS: Record<CustomSiteProjectType, string> = {
  "magazine-publication": "Magazine / Publication",
  "ecommerce-store": "E-commerce Store",
  "membership-paywall": "Membership / Paywall Site",
  "other-custom": "Other Custom Build",
};

export const FEATURE_LABELS: Record<CustomSiteFeature, string> = {
  payment: "Payment / checkout integration",
  inventory: "Inventory management",
  "multi-author-cms": "Multi-author / CMS publishing",
  subscriptions: "Subscriptions or memberships",
  "user-accounts": "User accounts / login",
  "custom-integrations": "Custom integrations",
  other: "Other",
};

export const BUDGET_RANGE_LABELS: Record<CustomSiteBudgetRange, string> = {
  under_500k: "Under ₦500k",
  "500k_2m": "₦500k–₦2M",
  "2m_plus": "₦2M+",
  not_sure: "Not sure",
};

export const TIMELINE_LABELS: Record<CustomSiteTimeline, string> = {
  asap: "ASAP",
  "1_month": "1 month",
  "1_3_months": "1–3 months",
  flexible: "Flexible",
};

export const STATUS_LABELS: Record<CustomSiteRequestStatus, string> = {
  pending: "Pending",
  in_review: "In review",
  approved: "Approved",
  declined: "Declined",
};

export const PROJECT_TYPES = Object.keys(
  PROJECT_TYPE_LABELS
) as CustomSiteProjectType[];

export const FEATURES = Object.keys(FEATURE_LABELS) as CustomSiteFeature[];

export const BUDGET_RANGES = Object.keys(
  BUDGET_RANGE_LABELS
) as CustomSiteBudgetRange[];

export const TIMELINES = Object.keys(TIMELINE_LABELS) as CustomSiteTimeline[];

/** Map onboarding unsupported businessType → funnel project type. */
export const ONBOARDING_TO_PROJECT_TYPE: Record<
  string,
  CustomSiteProjectType
> = {
  ecommerce: "ecommerce-store",
  "blog-publication": "magazine-publication",
  "nonprofit-community": "membership-paywall",
};

export function isCustomSiteProjectType(
  value: string
): value is CustomSiteProjectType {
  return (PROJECT_TYPES as readonly string[]).includes(value);
}

export function isCustomSiteFeature(value: string): value is CustomSiteFeature {
  return (FEATURES as readonly string[]).includes(value);
}

export function isCustomSiteBudgetRange(
  value: string
): value is CustomSiteBudgetRange {
  return (BUDGET_RANGES as readonly string[]).includes(value);
}

export function isCustomSiteTimeline(
  value: string
): value is CustomSiteTimeline {
  return (TIMELINES as readonly string[]).includes(value);
}

export function isCustomSiteRequestStatus(
  value: string
): value is CustomSiteRequestStatus {
  return (
    value === "pending" ||
    value === "in_review" ||
    value === "approved" ||
    value === "declined"
  );
}

/** Active statuses that should gate the user away from empty AI generation. */
export const ACTIVE_CUSTOM_SITE_STATUSES: CustomSiteRequestStatus[] = [
  "pending",
  "in_review",
  "approved",
];

export function isActiveCustomSiteStatus(
  status: string
): status is CustomSiteRequestStatus {
  return (ACTIVE_CUSTOM_SITE_STATUSES as readonly string[]).includes(status);
}

export interface CustomSiteRequestRow {
  id: string;
  user_id: string;
  project_type: CustomSiteProjectType;
  description: string;
  features: string[];
  custom_integrations_text: string | null;
  other_features_text: string | null;
  budget_range: CustomSiteBudgetRange | null;
  timeline: CustomSiteTimeline;
  reference_url: string | null;
  status: CustomSiteRequestStatus;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}
