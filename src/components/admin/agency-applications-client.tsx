"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FetchError, safeFetchJSON } from "@/lib/utils/safe-fetch";
import { PriceRangeLabel } from "@/lib/agencies/price-range-label";
import {
  AGENCY_SERVICE_LABELS,
  type Agency,
  type AgencyApplication,
  type AgencyService,
  type PortfolioItem,
} from "@/lib/agencies/types";

const STATUS_FILTERS = ["pending", "approved", "rejected"] as const;
type AppStatus = AgencyApplication["status"];

const STATUS_LABELS: Record<AppStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

function serviceLabel(key: string): string {
  return AGENCY_SERVICE_LABELS[key as AgencyService] ?? key;
}

function buildPortfolioItems(app: AgencyApplication): PortfolioItem[] {
  const urls = Array.isArray(app.portfolio_urls) ? app.portfolio_urls : [];
  const images = Array.isArray(app.portfolio_image_urls)
    ? app.portfolio_image_urls
    : [];

  if (images.length === 0 && urls.length === 0) return [];

  if (images.length > 0) {
    return images.map((image_url, i) => ({
      title: `Portfolio ${i + 1}`,
      description: "",
      url: urls[i] ?? urls[0] ?? image_url,
      image_url,
    }));
  }

  return urls.map((url, i) => ({
    title: i === 0 ? "Website" : `Link ${i + 1}`,
    description: "",
    url,
    image_url: null,
  }));
}

export function AgencyApplicationsAdminClient({
  initialApplications,
}: {
  initialApplications: AgencyApplication[];
}) {
  const [rows, setRows] = useState(initialApplications);
  const [selectedId, setSelectedId] = useState(initialApplications[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState<AppStatus | "all">("pending");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  function selectRow(row: AgencyApplication) {
    setSelectedId(row.id);
    setReason(row.reviewer_notes ?? "");
    setMessage(null);
  }

  function reject() {
    if (!selected || selected.status !== "pending") return;
    startTransition(async () => {
      setMessage(null);
      try {
        await safeFetchJSON(
          `/api/admin/agency-applications/${selected.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "rejected",
              reason: reason.trim() || null,
            }),
          }
        );
        setRows((prev) =>
          prev.map((r) =>
            r.id === selected.id
              ? {
                  ...r,
                  status: "rejected",
                  reviewer_notes: reason.trim() || null,
                  reviewed_at: new Date().toISOString(),
                }
              : r
          )
        );
        setMessage("Application rejected.");
      } catch (e) {
        setMessage(
          e instanceof FetchError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Failed to reject application"
        );
      }
    });
  }

  function approveAndPublish() {
    if (!selected || selected.status !== "pending") return;
    startTransition(async () => {
      setMessage(null);
      try {
        const tagline =
          (selected.description ?? "").trim().slice(0, 80) ||
          selected.agency_name;
        const { agency } = await safeFetchJSON<{ agency: Agency }>(
          "/api/admin/agencies",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: selected.agency_name,
              contact_email: selected.email,
              contact_whatsapp: selected.whatsapp,
              logo_url: selected.logo_url,
              description: selected.description,
              location_city: selected.location_city,
              services: selected.services,
              price_range: selected.price_range ?? "mid",
              portfolio_items: buildPortfolioItems(selected),
              application_id: selected.id,
              is_active: true,
              tagline,
            }),
          }
        );
        setRows((prev) =>
          prev.map((r) =>
            r.id === selected.id
              ? {
                  ...r,
                  status: "approved",
                  reviewer_notes: null,
                  reviewed_at: new Date().toISOString(),
                }
              : r
          )
        );
        setMessage(
          agency?.slug
            ? `Published. Listing: /agencies/${agency.slug}`
            : "Published and listing created."
        );
      } catch (e) {
        setMessage(
          e instanceof FetchError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Failed to approve and publish"
        );
      }
    });
  }

  const primaryService = selected?.services?.[0];
  const secondaryServices = selected?.services?.slice(1) ?? [];

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <aside className="max-h-[80vh] space-y-4 overflow-y-auto border border-border bg-surface p-4">
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...STATUS_FILTERS] as const).map((key) => (
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
              No applications.
            </li>
          )}
          {filtered.map((row) => {
            const active = row.id === selectedId;
            const primary = row.services?.[0];
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
                  <span className="block font-medium">{row.agency_name}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {row.location_city}
                    {primary ? ` · ${serviceLabel(primary)}` : ""} ·{" "}
                    {STATUS_LABELS[row.status]}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {new Date(row.created_at).toLocaleDateString()}
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
            Select an application to review.
          </p>
        ) : (
          <>
            <header className="page-head mb-4">
              <h1>{selected.agency_name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {selected.email} · {selected.location_city} ·{" "}
                {new Date(selected.created_at).toLocaleString()} ·{" "}
                {STATUS_LABELS[selected.status]}
              </p>
            </header>

            <dl className="surface space-y-3 p-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Contact</dt>
                  <dd className="mt-1">{selected.contact_name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd className="mt-1 break-all">{selected.email}</dd>
                </div>
              </div>
              {(selected.whatsapp || selected.phone) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {selected.whatsapp && (
                    <div>
                      <dt className="text-xs text-muted-foreground">WhatsApp</dt>
                      <dd className="mt-1">{selected.whatsapp}</dd>
                    </div>
                  )}
                  {selected.phone && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Phone</dt>
                      <dd className="mt-1">{selected.phone}</dd>
                    </div>
                  )}
                </div>
              )}
              {selected.website && (
                <div>
                  <dt className="text-xs text-muted-foreground">Website</dt>
                  <dd className="mt-1 break-all">
                    <a
                      href={selected.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold hover:underline"
                    >
                      {selected.website}
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">
                  Primary specialty
                </dt>
                <dd className="mt-1">
                  {primaryService ? serviceLabel(primaryService) : "—"}
                </dd>
              </div>
              {secondaryServices.length > 0 && (
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Secondary services
                  </dt>
                  <dd className="mt-1">
                    {secondaryServices.map(serviceLabel).join(", ")}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">Description</dt>
                <dd className="mt-1 whitespace-pre-wrap text-foreground">
                  {selected.description}
                </dd>
              </div>
              {selected.price_range && (
                <div>
                  <dt className="text-xs text-muted-foreground">Price range</dt>
                  <dd className="mt-1">
                    <PriceRangeLabel priceRange={selected.price_range} />
                  </dd>
                </div>
              )}
              {selected.logo_url && (
                <div>
                  <dt className="text-xs text-muted-foreground">Logo</dt>
                  <dd className="mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selected.logo_url}
                      alt=""
                      className="h-16 w-16 object-contain border border-border bg-background"
                    />
                  </dd>
                </div>
              )}
              {Array.isArray(selected.portfolio_image_urls) &&
                selected.portfolio_image_urls.length > 0 && (
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Portfolio images
                    </dt>
                    <dd className="mt-2 flex flex-wrap gap-2">
                      {selected.portfolio_image_urls.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt=""
                            className="h-20 w-20 object-cover border border-border"
                          />
                        </a>
                      ))}
                    </dd>
                  </div>
                )}
              {Array.isArray(selected.portfolio_urls) &&
                selected.portfolio_urls.length > 0 && (
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Portfolio links
                    </dt>
                    <dd className="mt-1 space-y-1">
                      {selected.portfolio_urls.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block break-all text-gold hover:underline"
                        >
                          {url}
                        </a>
                      ))}
                    </dd>
                  </div>
                )}
              {selected.reviewed_at && (
                <div>
                  <dt className="text-xs text-muted-foreground">Reviewed</dt>
                  <dd className="mt-1">
                    {new Date(selected.reviewed_at).toLocaleString()}
                    {selected.reviewer_notes
                      ? ` — ${selected.reviewer_notes}`
                      : ""}
                  </dd>
                </div>
              )}
            </dl>

            {selected.status === "pending" ? (
              <div className="surface mt-6 space-y-4 p-4">
                <div>
                  <label htmlFor="reject-reason" className="field-label block">
                    Rejection reason (optional)
                  </label>
                  <textarea
                    id="reject-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Shared with the applicant if you reject"
                    className="mt-2 w-full border border-[hsl(var(--input))] bg-[hsl(var(--surface-form))] px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={approveAndPublish}
                  >
                    {pending ? "Working…" : "Approve & publish"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={reject}
                  >
                    Reject
                  </Button>
                </div>
                {message && (
                  <p className="text-sm text-gold">
                    {message}{" "}
                    {message.startsWith("Published") && (
                      <Link
                        href="/admin/agencies"
                        className="underline hover:text-foreground"
                      >
                        Open agencies
                      </Link>
                    )}
                  </p>
                )}
              </div>
            ) : (
              <div className="surface mt-6 p-4">
                {message && <p className="text-sm text-gold">{message}</p>}
                {selected.status === "approved" && (
                  <p className="text-sm text-muted-foreground">
                    Approved.{" "}
                    <Link
                      href="/admin/agencies"
                      className="text-gold hover:underline"
                    >
                      Manage listing
                    </Link>
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
