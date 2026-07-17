"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Clock, Sparkles, Globe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BADGES } from "@/lib/constants";
import { actionCtaForTask } from "@/lib/dashboard/home-helpers";
import type { ActionPlanTaskRow, CompleteTaskResult } from "@/types/database";

type Props = {
  task: ActionPlanTaskRow | null;
  /** When site isn't published, this card becomes the publish CTA entirely. */
  websitePublished?: boolean;
};

export function TodaysActionCard({ task, websitePublished = true }: Props) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showAsset, setShowAsset] = useState(false);

  if (!websitePublished) {
    return (
      <section className="zuri-card border-l-4 border-l-gold">
        <Badge>Today&apos;s Action</Badge>
        <h2 className="mt-4 font-heading text-2xl font-medium tracking-tight">
          Publish your website
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground leading-relaxed">
          Content scheduling can wait — get your site live first so visitors
          and form submissions have somewhere to land.
        </p>
        <div className="mt-6">
          <Button asChild className="gap-2">
            <Link href="/website">
              <Globe className="size-4" strokeWidth={1.75} />
              Go to Website
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!task) {
    return (
      <section className="zuri-card flex items-start gap-4 border-l-4 border-l-gold/50">
        <CheckCircle2 className="mt-0.5 size-7 shrink-0 text-success" />
        <div>
          <Badge variant="muted">Today&apos;s Action</Badge>
          <h2 className="mt-3 font-heading text-2xl font-medium tracking-tight">
            You&apos;re all caught up
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Check tomorrow&apos;s plan — or fill a content gap while you&apos;re
            ahead.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/plan">View 90-day plan</Link>
          </Button>
        </div>
      </section>
    );
  }

  async function markDone() {
    setBusy(true);
    try {
      const res = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task!.id }),
      });
      const data = (await res.json()) as CompleteTaskResult;
      if (!res.ok) throw new Error("Failed");
      setDone(true);
      toast.success("Action complete");
      data.new_badges?.forEach((b) => {
        const badge = BADGES[b];
        if (badge) toast(`${badge.emoji} Badge earned: ${badge.label}`);
      });
    } catch {
      toast.error("Could not mark complete. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const preview =
    task.why_this_matters ||
    task.task_description ||
    (task.ai_asset ? task.ai_asset.slice(0, 160) : null);

  return (
    <section className="zuri-card relative overflow-hidden border-l-4 border-l-gold">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge>
          Today&apos;s Action · Day {task.day_number}
        </Badge>
        <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
          <Clock className="size-3.5" /> {task.estimated_minutes} min
        </span>
      </div>

      <h2 className="mt-4 font-heading text-2xl font-medium tracking-tight md:text-[1.7rem]">
        {task.task_title}
      </h2>
      {preview && (
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground leading-relaxed">
          {preview}
        </p>
      )}

      {task.ai_asset && showAsset && (
        <div className="mt-4 rounded-none border border-border bg-background p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-gold">
            <Sparkles className="size-3.5" /> Prepared draft
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {task.ai_asset}
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {task.ai_asset && (
          <Button variant="outline" onClick={() => setShowAsset((s) => !s)}>
            {showAsset ? "Hide draft" : "View draft"}
          </Button>
        )}
        <Button onClick={markDone} disabled={busy || done} className="gap-2">
          {busy ? (
            <span className="zuri-spinner" />
          ) : done ? (
            <CheckCircle2 className="size-4" />
          ) : null}
          {done ? "Completed" : actionCtaForTask(task)}
        </Button>
      </div>
    </section>
  );
}
