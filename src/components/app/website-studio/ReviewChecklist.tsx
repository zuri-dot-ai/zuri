"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import type { ReviewIssue } from "@/lib/website/review-issues";
import { cn } from "@/lib/utils";

export function ReviewChecklist({
  open,
  issues,
  onClose,
  onJump,
}: {
  open: boolean;
  issues: ReviewIssue[];
  onClose: () => void;
  onJump: (issue: ReviewIssue) => void;
}) {
  if (!open) return null;

  return (
    <div className="absolute left-0 top-full z-40 mt-2 w-[min(100vw-2rem,22rem)] rounded-sm border border-border bg-background shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-sm font-medium">
          {issues.length === 0 ? "All clear" : `${issues.length} to review`}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm p-1 text-muted-foreground hover:bg-surface"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <ul className="max-h-72 overflow-y-auto p-2">
        {issues.length === 0 ? (
          <li className="flex items-center gap-2 px-2 py-3 text-sm text-emerald-500">
            <CheckCircle2 className="size-4" />
            Ready to publish
          </li>
        ) : (
          issues.map((issue) => (
            <li key={issue.id}>
              <button
                type="button"
                onClick={() => onJump(issue)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm",
                  "text-muted-foreground hover:bg-surface hover:text-foreground"
                )}
              >
                <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                <span>{issue.label}</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
