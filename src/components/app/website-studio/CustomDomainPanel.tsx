"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Globe,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FetchError, safeFetchJSON } from "@/lib/utils/safe-fetch";

type DnsInstruction = {
  type: "A" | "CNAME";
  name: string;
  value: string;
  description: string;
};

type VerificationInstruction = {
  type: string;
  domain: string;
  value: string;
  reason?: string;
};

type DomainStatus =
  | "pending_verification"
  | "verified"
  | "verification_failed"
  | string
  | null;

type DomainState =
  | { has_custom_domain: false }
  | {
      has_custom_domain: true;
      domain: string;
      status: DomainStatus;
      added_at?: string | null;
      dns_instructions?: DnsInstruction[];
      verification_instructions?: VerificationInstruction[];
    };

export function CustomDomainPanel({
  plan,
  onUpgrade,
}: {
  plan: string;
  onUpgrade: () => void;
}) {
  const canConnect = plan === "growth" || plan === "premium";
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [state, setState] = useState<DomainState>({ has_custom_domain: false });
  const [dns, setDns] = useState<DnsInstruction[]>([]);
  const [verification, setVerification] = useState<VerificationInstruction[]>(
    []
  );

  const refresh = useCallback(async () => {
    try {
      const data = await safeFetchJSON<DomainState>(
        "/api/website/custom-domain"
      );
      setState(data);
      if (data.has_custom_domain) {
        setDns(data.dns_instructions ?? []);
        setVerification(data.verification_instructions ?? []);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load domain");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canConnect) {
      setLoading(false);
      return;
    }
    void refresh();
  }, [canConnect, refresh]);

  async function connect() {
    const domain = domainInput.trim().toLowerCase();
    if (!domain) return;
    setBusy(true);
    try {
      const data = await safeFetchJSON<{
        domain: string;
        status: DomainStatus;
        dns_instructions?: DnsInstruction[];
        verification_instructions?: VerificationInstruction[];
      }>("/api/website/custom-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      setState({
        has_custom_domain: true,
        domain: data.domain,
        status: data.status,
        dns_instructions: data.dns_instructions,
        verification_instructions: data.verification_instructions,
      });
      setDns(data.dns_instructions ?? []);
      setVerification(data.verification_instructions ?? []);
      setDomainInput("");
      toast.success("Domain added — update your DNS records");
    } catch (e) {
      if (e instanceof FetchError && e.status === 403) {
        onUpgrade();
        return;
      }
      toast.error(e instanceof Error ? e.message : "Could not add domain");
    } finally {
      setBusy(false);
    }
  }

  async function removeDomain() {
    if (
      !window.confirm(
        "Remove this custom domain? Your site will keep serving on its buildzuri.com subdomain."
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await safeFetchJSON("/api/website/custom-domain", { method: "DELETE" });
      setState({ has_custom_domain: false });
      setDns([]);
      setVerification([]);
      toast.success("Custom domain removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove domain");
    } finally {
      setBusy(false);
    }
  }

  function copyText(value: string) {
    void navigator.clipboard.writeText(value).then(
      () => toast.success("Copied"),
      () => toast.error("Could not copy")
    );
  }

  if (!canConnect) {
    return (
      <div className="space-y-4">
        <p className="text-card-body">
          Custom domains are available on Growth and Premium. Connect your own
          domain (e.g. yourbusiness.com) so customers find you on your brand.
        </p>
        <Button variant="outline" size="sm" onClick={onUpgrade}>
          View Growth plans
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading domain status…
      </div>
    );
  }

  if (!state.has_custom_domain) {
    return (
      <div className="space-y-4">
        <p className="text-card-body">
          Point your domain at Zuri. After DNS propagates (often minutes, up to
          48 hours), your published site will serve on that address.
        </p>
        <label className="block space-y-1.5">
          <span className="text-label">Domain</span>
          <input
            type="text"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder="www.yourbusiness.com"
            className="w-full rounded-sm border border-[var(--border-solid)] bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            disabled={busy}
          />
        </label>
        <Button
          size="sm"
          onClick={() => void connect()}
          disabled={busy || !domainInput.trim()}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Globe className="size-4" />
          )}
          {busy ? "Connecting…" : "Connect domain"}
        </Button>
      </div>
    );
  }

  const status = state.status;
  const statusBadge =
    status === "verified" ? (
      <Badge variant="success">Verified</Badge>
    ) : status === "verification_failed" ? (
      <Badge variant="outline" className="border-destructive/40 text-destructive">
        Verification failed
      </Badge>
    ) : verification.length > 0 ? (
      <Badge variant="outline" className="border-amber-500/50 text-amber-600">
        Ownership check needed
      </Badge>
    ) : (
      <Badge variant="outline" className="border-amber-500/50 text-amber-600">
        Pending DNS
      </Badge>
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Globe className="size-4 text-gold" />
        <span className="font-mono text-sm">{state.domain}</span>
        {statusBadge}
      </div>

      {status === "verified" ? (
        <div className="flex items-start gap-2 text-card-body">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
          <p>
            Your domain is live.{" "}
            <a
              href={`https://${state.domain}`}
              target="_blank"
              rel="noreferrer"
              className="text-gold underline-offset-2 hover:underline"
            >
              Open site
            </a>
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2 text-card-body">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <p>
            {verification.length > 0
              ? "Add this ownership-verification record first, then the DNS records below. Propagation can take up to 48 hours."
              : "Add these DNS records at your registrar. Propagation can take up to 48 hours."}
          </p>
        </div>
      )}

      {verification.length > 0 && status !== "verified" && (
        <div className="space-y-2">
          <p className="text-label">Ownership verification (add this first)</p>
          {verification.map((row, i) => (
            <div
              key={`verify-${row.domain}-${i}`}
              className="content-card space-y-2 border-amber-500/30 p-3"
            >
              <p className="text-card-meta">
                Required before Zuri can route traffic to this domain.
              </p>
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1 text-xs">
                <span className="text-muted-foreground">Type</span>
                <span className="font-mono">{row.type}</span>
                <span />
                <span className="text-muted-foreground">Name</span>
                <span className="truncate font-mono">{row.domain}</span>
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Copy name"
                  onClick={() => copyText(row.domain)}
                >
                  <Copy className="size-3.5" />
                </button>
                <span className="text-muted-foreground">Value</span>
                <span className="truncate font-mono">{row.value}</span>
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Copy value"
                  onClick={() => copyText(row.value)}
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {dns.length > 0 && status !== "verified" && (
        <div className="space-y-2">
          <p className="text-label">DNS records</p>
          {dns.map((row) => (
            <div
              key={`${row.type}-${row.name}-${row.value}`}
              className="content-card space-y-2 p-3"
            >
              <p className="text-card-meta">{row.description}</p>
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1 text-xs">
                <span className="text-muted-foreground">Type</span>
                <span className="font-mono">{row.type}</span>
                <span />
                <span className="text-muted-foreground">Name</span>
                <span className="truncate font-mono">{row.name}</span>
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Copy name"
                  onClick={() => copyText(row.name)}
                >
                  <Copy className="size-3.5" />
                </button>
                <span className="text-muted-foreground">Value</span>
                <span className="truncate font-mono">{row.value}</span>
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Copy value"
                  onClick={() => copyText(row.value)}
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {status !== "verified" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              void refresh();
            }}
            disabled={busy}
          >
            Refresh status
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => void removeDomain()}
          disabled={busy}
          className="border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-4" />
          Remove
        </Button>
      </div>
    </div>
  );
}
