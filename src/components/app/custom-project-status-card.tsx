import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PROJECT_TYPE_LABELS,
  STATUS_LABELS,
  type CustomSiteProjectType,
  type CustomSiteRequestStatus,
} from "@/lib/custom-site/types";

const COPY: Record<
  CustomSiteRequestStatus,
  { title: string; body: string }
> = {
  pending: {
    title: "Custom project submitted — we'll be in touch",
    body: "Our team has your request and will follow up by email shortly.",
  },
  in_review: {
    title: "Your custom project is in review",
    body: "We're scoping your build and will update you when there's a decision.",
  },
  approved: {
    title: "Your custom project was approved",
    body: "Next step: our team will reach out to kick off the build. Watch your inbox.",
  },
  declined: {
    title: "Custom project not moving forward",
    body: "You can still create a self-serve AI website anytime — or contact us if you'd like to revisit scope.",
  },
};

export function CustomProjectStatusCard({
  status,
  projectType,
  reviewerNotes,
}: {
  status: CustomSiteRequestStatus;
  projectType: string;
  reviewerNotes?: string | null;
}) {
  const copy = COPY[status];
  const typeLabel =
    PROJECT_TYPE_LABELS[projectType as CustomSiteProjectType] ?? projectType;

  return (
    <div className="content-card space-y-3 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="eyebrow">Custom build</p>
        <span className="rounded-sm border border-border px-2 py-0.5 text-xs text-[var(--text-tertiary)]">
          {STATUS_LABELS[status]}
        </span>
      </div>
      <h2 className="font-heading text-xl text-foreground">{copy.title}</h2>
      <p className="text-sm text-muted-foreground">{copy.body}</p>
      <p className="text-xs text-[var(--text-tertiary)]">
        Project type: {typeLabel}
      </p>
      {reviewerNotes && status === "declined" && (
        <p className="text-sm text-muted-foreground">{reviewerNotes}</p>
      )}
      {status === "declined" && (
        <div className="pt-1">
          <Button asChild>
            <Link href="/api/custom-site/start-selfserve">
              Start a self-serve site
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
