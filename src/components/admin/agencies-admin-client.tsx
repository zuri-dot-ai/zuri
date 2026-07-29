"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FetchError, safeFetchJSON } from "@/lib/utils/safe-fetch";
import { PriceRangeLabel } from "@/lib/agencies/price-range-label";
import {
  AGENCY_SERVICE_LABELS,
  type Agency,
  type AgencyService,
} from "@/lib/agencies/types";

type AgencyFilter = "all" | "active" | "inactive";

function serviceLabels(services: string[]): string {
  return services
    .map((s) => AGENCY_SERVICE_LABELS[s as AgencyService] ?? s)
    .join(", ");
}

export function AgenciesAdminClient({
  initialAgencies,
}: {
  initialAgencies: Agency[];
}) {
  const [rows, setRows] = useState(initialAgencies);
  const [selectedId, setSelectedId] = useState(initialAgencies[0]?.id ?? "");
  const [filter, setFilter] = useState<AgencyFilter>("all");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (filter === "active") return rows.filter((r) => r.is_active);
    if (filter === "inactive") return rows.filter((r) => !r.is_active);
    return rows;
  }, [rows, filter]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  function selectRow(row: Agency) {
    setSelectedId(row.id);
    setMessage(null);
  }

  function patchFlags(updates: Partial<
    Pick<
      Agency,
      "is_active" | "is_featured" | "is_verified" | "is_zuri_certified"
    >
  >) {
    if (!selected) return;
    startTransition(async () => {
      setMessage(null);
      try {
        await safeFetchJSON("/api/admin/agencies", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selected.id, ...updates }),
        });
        setRows((prev) =>
          prev.map((r) => (r.id === selected.id ? { ...r, ...updates } : r))
        );
        const label = Object.entries(updates)
          .map(([k, v]) => `${k.replace(/^is_/, "")}=${v}`)
          .join(", ");
        setMessage(`Updated (${label}).`);
      } catch (e) {
        setMessage(
          e instanceof FetchError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Failed to update agency"
        );
      }
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <aside className="max-h-[80vh] space-y-4 overflow-y-auto border border-border bg-surface p-4">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "All"],
              ["active", "Active"],
              ["inactive", "Inactive"],
            ] as const
          ).map(([key, label]) => (
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
              {label}
            </button>
          ))}
        </div>
        <ul className="space-y-1">
          {filtered.length === 0 && (
            <li className="px-2 py-4 text-sm text-muted-foreground">
              No agencies.
            </li>
          )}
          {filtered.map((row) => {
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
                  <span className="block font-medium">{row.name}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {row.location_city} ·{" "}
                    {row.is_active ? "Active" : "Inactive"}
                    {row.is_featured ? " · Featured" : ""}
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
            Select an agency to manage.
          </p>
        ) : (
          <>
            <header className="page-head mb-4">
              <h1>{selected.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {selected.contact_email} · {selected.location_city} · /
                {selected.slug}
              </p>
            </header>

            <dl className="surface space-y-3 p-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Tagline</dt>
                <dd className="mt-1">{selected.tagline || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Description</dt>
                <dd className="mt-1 whitespace-pre-wrap">
                  {selected.description || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Services</dt>
                <dd className="mt-1">
                  {serviceLabels(selected.services ?? []) || "—"}
                </dd>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Price range</dt>
                  <dd className="mt-1">
                    <PriceRangeLabel priceRange={selected.price_range} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Inquiries</dt>
                  <dd className="mt-1">{selected.inquiries_count ?? 0}</dd>
                </div>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Public listing</dt>
                <dd className="mt-1">
                  <Link
                    href={`/agencies/${selected.slug}`}
                    className="text-gold hover:underline"
                    target="_blank"
                  >
                    /agencies/{selected.slug}
                  </Link>
                </dd>
              </div>
            </dl>

            <div className="surface mt-6 p-4">
              <p className="field-label mb-3">Listing flags</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={selected.is_active ? "default" : "outline"}
                  disabled={pending}
                  onClick={() =>
                    patchFlags({ is_active: !selected.is_active })
                  }
                >
                  {selected.is_active ? "Unpublish" : "Publish"}
                </Button>
                <Button
                  type="button"
                  variant={selected.is_featured ? "default" : "outline"}
                  disabled={pending}
                  onClick={() =>
                    patchFlags({ is_featured: !selected.is_featured })
                  }
                >
                  {selected.is_featured ? "Unfeature" : "Feature"}
                </Button>
                <Button
                  type="button"
                  variant={selected.is_verified ? "default" : "outline"}
                  disabled={pending}
                  onClick={() =>
                    patchFlags({ is_verified: !selected.is_verified })
                  }
                >
                  {selected.is_verified ? "Unverify" : "Verify"}
                </Button>
                <Button
                  type="button"
                  variant={selected.is_zuri_certified ? "default" : "outline"}
                  disabled={pending}
                  onClick={() =>
                    patchFlags({
                      is_zuri_certified: !selected.is_zuri_certified,
                    })
                  }
                >
                  {selected.is_zuri_certified
                    ? "Remove certified"
                    : "Zuri certified"}
                </Button>
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
