"use client";

import { ExternalLink } from "lucide-react";

interface Props {
  context?: "onboarding" | "dashboard" | "editor" | "general";
  requestedFeature?: string;
}

/**
 * Shown when the user picks an unsupported branch (docs/02_WEBSITE_BUILDER.md §1, §12).
 * Never say "we can't do this" — route them to the custom build team.
 */
export function CustomSiteCTA({
  context = "general",
  requestedFeature,
}: Props) {
  void context;
  const subject = requestedFeature
    ? `Custom website enquiry — ${requestedFeature}`
    : "Custom website enquiry";

  return (
    <div className="surface p-6">
      <p className="eyebrow mb-2">Built by our team</p>
      <h3 className="mb-2 font-heading text-xl text-foreground">
        {requestedFeature
          ? `${requestedFeature} requires a custom build`
          : "Need something more complex?"}
      </h3>
      <p className="mb-4 text-sm text-muted-foreground">
        E-commerce stores, blogs, membership sites, and custom backends are built
        by the Zuri team. We specialise in complex builds for African businesses.
      </p>
      <a
        href={`mailto:build@buildzuri.com?subject=${encodeURIComponent(subject)}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-gold"
      >
        Contact our team <ExternalLink className="size-3.5" />
      </a>
    </div>
  );
}
