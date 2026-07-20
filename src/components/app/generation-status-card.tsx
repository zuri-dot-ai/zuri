"use client";

import Link from "next/link";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export function GenerationStatusCard({
  status,
  errorMessage,
  jobId,
}: {
  status: "queued" | "processing" | "failed" | "completed" | null;
  errorMessage?: string | null;
  jobId?: string | null;
}) {
  const [retrying, setRetrying] = useState(false);

  if (!status || status === "completed") return null;

  async function retry() {
    setRetrying(true);
    try {
      // Prefer existing jobId; omit it so the API creates a new job when none exists
      const body: { jobId?: string } = {};
      if (jobId) body.jobId = jobId;

      const res = await fetch("/api/ai/generate-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Retry failed");
      toast.success("Generation restarted. This usually takes under a minute.");
      window.location.href = "/dashboard";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not retry generation");
    } finally {
      setRetrying(false);
    }
  }

  if (status === "failed") {
    return (
      <div className="surface flex flex-col gap-3 border border-[var(--danger,#e2555a)]/40 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[var(--danger,#e2555a)]" />
          <div>
            <h3 className="font-medium">Website generation failed</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {errorMessage ||
                "Something went wrong while building your site. You can retry without losing your onboarding answers."}
            </p>
          </div>
        </div>
        <Button onClick={retry} disabled={retrying} className="shrink-0">
          {retrying ? (
            <span className="zuri-spinner" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Retry generation
        </Button>
      </div>
    );
  }

  return (
    <div className="surface flex items-start gap-3 border border-gold/30 p-5">
      <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-gold" />
      <div>
        <h3 className="font-medium">Building your website…</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Finding your style, writing your copy, and adding finishing touches.
          You can keep browsing — we&apos;ll update this when it&apos;s ready.{" "}
          <Link href="/website" className="text-gold hover:underline">
            Check website
          </Link>
        </p>
      </div>
    </div>
  );
}
