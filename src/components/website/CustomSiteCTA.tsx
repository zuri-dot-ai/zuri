"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ONBOARDING_TO_PROJECT_TYPE } from "@/lib/custom-site/types";

interface Props {
  context?: "onboarding" | "dashboard" | "editor" | "general";
  requestedFeature?: string;
  /** Optional onboarding businessType id for prefilling the funnel. */
  businessType?: string;
  /** When true, compact card for editor/sidebar. */
  compact?: boolean;
  /** If user already has an open request, link to dashboard instead. */
  hasOpenRequest?: boolean;
}

/**
 * Entry into the custom-site premium funnel.
 * Never say "we can't do this" — route them to the custom build team.
 */
export function CustomSiteCTA({
  context = "general",
  requestedFeature,
  businessType,
  compact = false,
  hasOpenRequest = false,
}: Props) {
  const projectType =
    businessType && ONBOARDING_TO_PROJECT_TYPE[businessType]
      ? ONBOARDING_TO_PROJECT_TYPE[businessType]
      : undefined;

  const href = hasOpenRequest
    ? "/dashboard"
    : projectType
      ? `/custom-site?from=${context}&type=${encodeURIComponent(projectType)}`
      : `/custom-site?from=${context}`;

  const title = hasOpenRequest
    ? "Custom project in progress"
    : requestedFeature
      ? `${requestedFeature} requires a custom build`
      : "Need something more custom?";

  const body = hasOpenRequest
    ? "We're reviewing your custom project request. Check your dashboard for status."
    : "E-commerce stores, blogs, membership sites, and custom backends are built by the Zuri team. We specialise in complex builds for African businesses.";

  const cta = hasOpenRequest
    ? "View status"
    : context === "onboarding"
      ? "Continue to custom project request"
      : "Start a custom project request";

  return (
    <div className={compact ? "surface p-4" : "surface p-6"}>
      <p className="eyebrow mb-2">Built by our team</p>
      <h3
        className={
          compact
            ? "mb-1.5 font-heading text-lg text-foreground"
            : "mb-2 font-heading text-xl text-foreground"
        }
      >
        {title}
      </h3>
      <p
        className={
          compact
            ? "mb-3 text-xs text-muted-foreground"
            : "mb-4 text-sm text-muted-foreground"
        }
      >
        {body}
      </p>
      <Link
        href={href}
        className="inline-flex items-center gap-2 text-sm font-medium text-gold"
      >
        {cta} <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
