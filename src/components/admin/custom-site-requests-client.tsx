"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FetchError, safeFetchJSON } from "@/lib/utils/safe-fetch";
import {
  BUDGET_RANGE_LABELS,
  FEATURE_LABELS,
  PROJECT_TYPE_LABELS,
  STATUS_LABELS,
  TIMELINE_LABELS,
  type CustomSiteBudgetRange,
  type CustomSiteFeature,
  type CustomSiteProjectType,
  type CustomSiteRequestStatus,
  type CustomSiteTimeline,
} from "@/lib/custom-site/types";

export type AdminCustomSiteRequest = {
  id: string;
  user_id: string;
  project_type: string;
  description: string;
  features: string[];
  custom_integrations_text: string | null;
  other_features_text: string | null;
  budget_range: string | null;
  timeline: string;
  reference_url: string | null;
  status: CustomSiteRequestStatus;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  profiles:
    | { full_name: string | null; email: string | null }
    | { full_name: string | null; email: string | null }[]
    | null;
};

const STATUS_ACTIONS: CustomSiteRequestStatus[] = [
  "pending",
  "in_review",
  "approved",
  "declined",
];

function profileOf(row: AdminCustomSiteRequest) {
  const p = row.profiles;
  return Array.isArray(p) ? p[0] : p;
}

export function CustomSiteRequestsAdminClient({
  initialRequests,
}: {
  initialRequests: AdminCustomSiteRequest[];
}) {
  const [rows, setRows] = useState(initialRequests);
  const [selectedId, setSelectedId] = useState(initialRequests[0]?.id ?? "");
  const [notes, setNotes] = useState(initialRequests[0]?.reviewer_notes ?? "");
  const [filter, setFilter] = useState<CustomSiteRequestStatus | "all">("all");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  function selectRow(row: AdminCustomSiteRequest) {
    setSelectedId(row.id);
    setNotes(row.reviewer_notes ?? "");
    setMessage(null);
  }

  function updateStatus(status: CustomSiteRequestStatus) {
    if (!selected) return;
    startTransition(async () => {
      setMessage(null);
      try {
        await safeFetchJSON(`/api/admin/custom-site-requests/${selected.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            reviewer_notes: notes.trim() || null,
          }),
        });
        setRows((prev) =>
          prev.map((r) =>
            r.id === selected.id
              ? {
                  ...r,
                  status,
                  reviewer_notes: notes.trim() || null,
                  reviewed_at: new Date().toISOString(),
                }
              : r
          )
        );
        setMessage(`Updated to ${STATUS_LABELS[status]}`);
      } catch (e) {
        setMessage(
          e instanceof FetchError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Failed to update status"
        );
      }
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <aside className="max-h-[80vh] space-y-4 overflow-y-auto border border-border bg-surface p-4">
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...STATUS_ACTIONS] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-sm border px-2 py-1 text-xs ${
                filter === key
                  ? "border-gold bg-gold/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-[var(--border-hover)]"
              }`}
            >
              {key === "all" ? "All" : STATUS_LABELS[key]}
            </button>
          ))}
        </div>
        <ul className="space-y-1">
          {filtered.length === 0 && (
            <li className="px-2 py-4 text-sm text-muted-foreground">
              No requests.
            </li>
          )}
          {filtered.map((row) => {
            const profile = profileOf(row);
            const active = row.id === selectedId;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => selectRow(row)}
                  className={`w-full px-3 py-2 text-left text-sm transition ${
                    active
                      ? "border border-gold bg-muted text-foreground"
                      : "border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="block font-medium">
                    {profile?.full_name || profile?.email || "Unknown user"}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {PROJECT_TYPE_LABELS[
                      row.project_type as CustomSiteProjectType
                    ] ?? row.project_type}{" "}
                    · {STATUS_LABELS[row.status]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="min-w-0">
        {!selected ? (
          <p className="text-sm text-muted-foreground">
            Select a request to review.
          </p>
        ) : (
          <>
            <header className="page-head mb-4">
              <h1>
                {PROJECT_TYPE_LABELS[
                  selected.project_type as CustomSiteProjectType
                ] ?? selected.project_type}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {profileOf(selected)?.email} ·{" "}
                {new Date(selected.created_at).toLocaleString()} ·{" "}
                {STATUS_LABELS[selected.status]}
              </p>
            </header>

            <dl className="surface space-y-3 p-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Description</dt>
                <dd className="mt-1 text-foreground">{selected.description}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Features</dt>
                <dd className="mt-1 text-foreground">
                  {selected.features
                    .map(
                      (f) =>
                        FEATURE_LABELS[f as CustomSiteFeature] ?? f
                    )
                    .join(", ") || "—"}
                </dd>
              </div>
              {selected.custom_integrations_text && (
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Custom integrations
                  </dt>
                  <dd className="mt-1">{selected.custom_integrations_text}</dd>
                </div>
              )}
              {selected.other_features_text && (
                <div>
                  <dt className="text-xs text-muted-foreground">Other</dt>
                  <dd className="mt-1">{selected.other_features_text}</dd>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Budget</dt>
                  <dd className="mt-1">
                    {selected.budget_range
                      ? BUDGET_RANGE_LABELS[
                          selected.budget_range as CustomSiteBudgetRange
                        ]
                      : "Not specified"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Timeline</dt>
                  <dd className="mt-1">
                    {TIMELINE_LABELS[
                      selected.timeline as CustomSiteTimeline
                    ] ?? selected.timeline}
                  </dd>
                </div>
              </div>
              {selected.reference_url && (
                <div>
                  <dt className="text-xs text-muted-foreground">Reference</dt>
                  <dd className="mt-1 break-all">
                    <a
                      href={selected.reference_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold hover:underline"
                    >
                      {selected.reference_url}
                    </a>
                  </dd>
                </div>
              )}
            </dl>

            <div className="surface mt-6 p-4">
              <label
                htmlFor="reviewer-notes"
                className="field-label block"
              >
                Reviewer notes
              </label>
              <textarea
                id="reviewer-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Optional notes for the user (sent on approve/decline)"
                className="mt-2 w-full border border-[hsl(var(--input))] bg-[hsl(var(--surface-form))] px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {STATUS_ACTIONS.map((status) => (
                  <Button
                    key={status}
                    type="button"
                    variant={
                      selected.status === status ? "default" : "outline"
                    }
                    disabled={pending || selected.status === status}
                    onClick={() => updateStatus(status)}
                  >
                    {pending ? "Saving…" : STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
              {message && (
                <p className="mt-3 text-sm text-gold">{message}</p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
