"use client";

import Link from "next/link";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";

type JobStatus = "queued" | "processing" | "failed" | "completed" | null;

export function GenerationStatusCard({
  status: initialStatus,
  errorMessage: initialError,
  jobId,
}: {
  status: JobStatus;
  errorMessage?: string | null;
  jobId?: string | null;
}) {
  const [retrying, setRetrying] = useState(false);
  const [status, setStatus] = useState<JobStatus>(initialStatus);
  const [errorMessage, setErrorMessage] = useState(initialError);
  const kickoffAttempted = useRef(false);
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    setStatus(initialStatus);
    setErrorMessage(initialError);
  }, [initialStatus, initialError]);

  // Poll job status + kick off stuck queued jobs
  useEffect(() => {
    if (!jobId || !initialStatus || initialStatus === "completed" || initialStatus === "failed") {
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    async function poll() {
      const { data } = await supabase
        .from("website_generation_jobs")
        .select("status, error_message")
        .eq("id", jobId!)
        .maybeSingle();

      if (cancelled || !data) return;

      const next = data.status as JobStatus;
      setStatus(next);
      setErrorMessage(data.error_message);

      if (next === "completed") {
        toast.success("Your website is ready!");
        window.location.reload();
      }
    }

    async function kickoffIfStuck() {
      if (kickoffAttempted.current || statusRef.current !== "queued") return;
      kickoffAttempted.current = true;

      try {
        await safeFetchJSON("/api/ai/generate-website", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId }),
        });
        setStatus("processing");
        void poll();
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Could not start website generation";
        toast.error(message);
        setStatus("failed");
        setErrorMessage(message);
      }
    }

    const kickoffTimer = setTimeout(() => void kickoffIfStuck(), 3000);
    const pollTimer = setInterval(() => void poll(), 4000);
    void poll();

    return () => {
      cancelled = true;
      clearTimeout(kickoffTimer);
      clearInterval(pollTimer);
    };
  }, [jobId, initialStatus]);

  if (!status || status === "completed") return null;

  async function retry() {
    setRetrying(true);
    try {
      const body: { jobId?: string } = {};
      if (jobId) body.jobId = jobId;

      await safeFetchJSON("/api/ai/generate-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      toast.success("Generation restarted. This usually takes under a minute.");
      setStatus("processing");
      window.location.reload();
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

  const statusLabel =
    status === "queued"
      ? "Queued — starting your website build…"
      : "Building your website…";

  return (
    <div className="surface flex items-start gap-3 border border-gold/30 p-5">
      <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-gold" />
      <div>
        <h3 className="font-medium">{statusLabel}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Finding your style, writing your copy, and adding finishing touches.
          This page updates automatically when your site is ready.{" "}
          <Link href="/website" className="text-gold hover:underline">
            Check website
          </Link>
        </p>
      </div>
    </div>
  );
}
