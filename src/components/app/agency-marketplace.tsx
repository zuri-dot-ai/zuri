"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Star, MapPin, Clock, CheckCircle2, Sparkles, X, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";
import { UpgradeSheet } from "@/components/app/upgrade-sheet";
import type { AgencyRow, AgencyBrief } from "@/types/database";

const SPECIALTIES = ["all", "instagram", "linkedin", "video", "email", "facebook", "tiktok"];

export function AgencyMarketplace({ agencies, plan }: { agencies: AgencyRow[]; plan: string }) {
  const [filter, setFilter] = useState("all");
  const [active, setActive] = useState<AgencyRow | null>(null);
  const [brief, setBrief] = useState<AgencyBrief | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const isGrowth = plan === "growth" || plan === "premium";
  const filtered = filter === "all" ? agencies : agencies.filter((a) => a.specialties.includes(filter));

  async function openMatch(agency: AgencyRow) {
    if (!isGrowth) {
      setUpgradeOpen(true);
      return;
    }
    setActive(agency);
    setBrief(null);
    setLoadingBrief(true);
    try {
      const data = await safeFetchJSON<{ brief: AgencyBrief }>(
        "/api/agencies/brief",
        { method: "POST" }
      );
      setBrief(data.brief);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate brief");
    } finally {
      setLoadingBrief(false);
    }
  }

  async function submitMatch() {
    if (!active || !brief) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/agencies/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agencyId: active.id, brief }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Brief sent to ${active.name}! They'll respond within ${active.response_time_hours}h.`);
      setActive(null);
    } catch {
      toast.error("Could not send brief");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="page-head">
        <h1>Agency Marketplace</h1>
        <p className="mt-1 text-muted-foreground">
          Vetted execution partners, matched to your brand. Zuri writes the brief for you.
        </p>
      </header>

      {!isGrowth && (
        <div className="surface flex items-center justify-between gap-3 border border-border p-4">
          <div className="flex items-center gap-3">
            <Lock className="size-5 shrink-0 text-gold" />
            <p className="text-sm">
              <span className="font-medium text-gold">Growth feature.</span>{" "}
              Browse partners now — upgrade to send AI-matched briefs.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setUpgradeOpen(true)}>
            Upgrade
          </Button>
        </div>
      )}

      {agencies.length === 0 && (
        <div className="empty-state py-16 text-center">
          <h3>Partners coming soon</h3>
          <p>
            We&apos;re onboarding vetted agencies for your market. Check back shortly —
            or contact support if you need a custom intro.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {SPECIALTIES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-sm border px-4 py-1.5 text-sm capitalize transition-all",
              filter === s
                ? "border-gold bg-gold text-[var(--accent-foreground)]"
                : "border-border text-muted-foreground hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)]"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Agency cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((agency) => (
          <div key={agency.id} className="zuri-card flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3
                    className="truncate font-heading text-xl font-semibold"
                    title={agency.name}
                  >
                    {agency.name}
                  </h3>
                  {agency.is_verified && (
                    <CheckCircle2 className="size-4 shrink-0 text-gold" />
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex shrink-0 items-center gap-1"><Star className="size-3.5 fill-gold text-gold" /> {agency.rating} ({agency.review_count})</span>
                  {agency.location && <span className="flex min-w-0 items-center gap-1 truncate"><MapPin className="size-3.5 shrink-0" /> <span className="truncate" title={agency.location}>{agency.location}</span></span>}
                </div>
              </div>
              {agency.is_featured && <Badge className="shrink-0">Featured</Badge>}
            </div>

            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{agency.description}</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {agency.specialties.map((s) => (
                <Badge key={s} variant="outline" className="max-w-full capitalize">
                  {s}
                </Badge>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-semibold text-gold" title={agency.price_range ?? undefined}>
                  {agency.price_range}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3 shrink-0" /> Responds in {agency.response_time_hours}h
                </p>
              </div>
              <Button size="sm" disabled={!isGrowth} onClick={() => openMatch(agency)} className="shrink-0">
                {isGrowth ? "Get Matched" : "Upgrade"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Brief drawer */}
      {active && (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/80" onClick={() => setActive(null)}>
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="min-w-0 truncate font-heading text-2xl font-semibold" title={`Match with ${active.name}`}>
                Match with {active.name}
              </h2>
              <button onClick={() => setActive(null)} className="shrink-0 rounded-sm p-1.5 text-muted-foreground hover:bg-muted">
                <X className="size-5" />
              </button>
            </div>

            <p className="mt-2 flex items-center gap-1.5 text-sm text-gold">
              <Sparkles className="size-4" /> Zuri auto-generated this brief from your brand profile
            </p>

            {loadingBrief ? (
              <div className="flex items-center gap-2 py-16 text-muted-foreground">
                <span className="zuri-spinner" /> Writing your brief…
              </div>
            ) : brief ? (
              <div className="mt-5 space-y-4">
                <BriefField label="Business summary" value={brief.business_summary} />
                <BriefField label="Goals" value={brief.goals?.join(", ")} />
                <BriefField label="Platforms" value={brief.platforms?.join(", ")} />
                <BriefField label="Content volume" value={brief.content_volume} />
                <BriefField label="Budget range" value={brief.budget_range} />
                <BriefField label="Timeline" value={brief.timeline} />
                <Button className="w-full" onClick={submitMatch} disabled={submitting}>
                  {submitting ? <span className="zuri-spinner" /> : null}
                  Send brief to {active.name}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      )}
      <UpgradeSheet
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        feature="Agency briefs"
        benefit="Growth unlocks AI-matched briefs so vetted partners can execute for you — browsing stays free."
        requiredPlan="Growth"
      />
    </div>
  );
}

function BriefField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}
