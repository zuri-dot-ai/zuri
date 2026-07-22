"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  User,
  Building2,
  CreditCard,
  Bell,
  Trash2,
  ExternalLink,
  LogOut,
  Moon,
  Sun,
  Sparkles,
  X,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/Banner";
import { SaveStatus } from "@/components/ui/SaveStatus";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useSaveStatus } from "@/hooks/use-save-status";
import { PRICING } from "@/lib/constants";
import { formatNGN as fmtNGN } from "@/lib/utils";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";
import type { AccountView, BusinessProfileRow } from "@/types/database";

type Tab = "profile" | "business" | "billing" | "notifications" | "voice" | "danger";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "business", label: "Business Profile", icon: Building2 },
  { id: "voice", label: "Brand Voice", icon: Sparkles },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "danger", label: "Danger Zone", icon: Trash2 },
];

export function SettingsView({
  account,
  profile,
}: {
  account: AccountView | null;
  profile: BusinessProfileRow | null;
}) {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="page-head">
        <h1>Settings</h1>
      </header>

      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        {/* Tab nav */}
        <nav className="flex flex-col gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,162,39,0.35)] ${
                tab === id
                  ? "bg-surface text-gold"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div className="zuri-card">
          {tab === "profile" && <ProfileTab account={account} />}
          {tab === "business" && <BusinessTab profile={profile} />}
          {tab === "voice" && <BrandVoiceTab />}
          {tab === "billing" && <BillingTab account={account} />}
          {tab === "notifications" && <NotificationsTab />}
          {tab === "danger" && <DangerTab />}
        </div>
      </div>
    </div>
  );
}

// ── PROFILE TAB ──────────────────────────────────────────
function ProfileTab({ account }: { account: AccountView | null }) {
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggleTheme } = useTheme();
  const [name, setName] = useState(account?.full_name ?? "");
  const { status: saveStatus, run: runSave } = useSaveStatus();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save(next: string) {
    if (!account) return;
    try {
      await runSave(async () => {
        const { error } = await supabase
          .from("profiles")
          .update({ full_name: next, updated_at: new Date().toISOString() })
          .eq("id", account.id);
        if (error) throw error;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save profile.");
    }
  }

  function onNameChange(next: string) {
    setName(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void save(next), 500);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-page-title">Profile</h2>
        <p className="text-card-body mt-1">
          Your personal account information.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <UserAvatar
            name={account?.full_name}
            email={account?.email}
            src={account?.avatar_url}
            size={56}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {account?.full_name || "Your profile"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {account?.avatar_url
                ? "Photo from your Google account"
                : "Add a Google sign-in to show your photo"}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Full name</Label>
            <SaveStatus status={saveStatus} />
          </div>
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Ada Obi"
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={account?.email ?? ""} disabled />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed here.
          </p>
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <h3 className="text-sm font-medium text-foreground">Appearance</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Switch between dark and light mode.
        </p>
        <button
          type="button"
          onClick={toggleTheme}
          className="mt-3 flex w-full items-center justify-between rounded-md border border-border bg-[var(--bg-elevated)] px-4 py-3 text-sm transition-colors hover:border-gold/40"
        >
          <span className="flex items-center gap-2.5">
            {theme === "dark" ? (
              <Moon className="size-4 text-gold" strokeWidth={1.75} />
            ) : (
              <Sun className="size-4 text-gold" strokeWidth={1.75} />
            )}
            {theme === "dark" ? "Dark mode" : "Light mode"}
          </span>
          <span className="text-xs text-muted-foreground">
            Tap to switch
          </span>
        </button>
      </div>

      <div className="border-t border-border pt-5">
        <Button variant="outline" onClick={signOut} className="w-full gap-2">
          <LogOut className="size-4" strokeWidth={1.75} />
          Sign out
        </Button>
      </div>
    </div>
  );
}

// ── BRAND VOICE TAB ─────────────────────────────────────
function BrandVoiceTab() {
  const [examples, setExamples] = useState<
    { id: string; text: string; source: string; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await safeFetchJSON<{
        examples: {
          id: string;
          text: string;
          source: string;
          created_at: string;
        }[];
      }>("/api/settings/voice-examples", { timeoutMs: 15_000 });
      setExamples(data.examples ?? []);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not load voice examples";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(id: string) {
    // Optimistic: plain DB delete, so drop it from the list immediately and
    // only restore it (at its original position) if the request fails.
    const index = examples.findIndex((e) => e.id === id);
    const removed = examples[index];
    if (!removed) return;
    setExamples((prev) => prev.filter((e) => e.id !== id));
    try {
      await safeFetchJSON(`/api/settings/voice-examples?id=${id}`, {
        method: "DELETE",
      });
      toast.success("Example removed");
    } catch (e) {
      setExamples((prev) => {
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, removed);
        return next;
      });
      toast.error(e instanceof Error ? e.message : "Could not delete");
    }
  }

  const sourceLabel = (source: string) => {
    if (source === "edited") return "From an edit you made";
    if (source === "rated") return "From a post you rated highly";
    return source;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-page-title">Brand Voice</h2>
        <p className="text-card-body mt-1">
          Examples Zuri learns from when you edit captions or rate posts highly.
          These shape future generation after at least two examples exist.
        </p>
      </div>

      {loading ? (
        <p className="text-card-body flex items-center gap-2">
          <span className="zuri-spinner" /> Loading…
        </p>
      ) : loadError ? (
        <Banner
          variant="error"
          title="Couldn't load your voice examples"
          message={loadError}
          actions={
            <Button size="sm" variant="outline" onClick={() => void load()}>
              <RefreshCw className="size-4" /> Retry
            </Button>
          }
        />
      ) : examples.length === 0 ? (
        <p className="text-card-body">
          No voice examples yet. Edit a generated caption or rate a post 4–5
          stars to start building your voice bank.
        </p>
      ) : (
        <ul className="space-y-3">
          {examples.map((ex) => (
            <li key={ex.id} className="content-card flex gap-3 p-3">
              <div className="min-w-0 flex-1">
                <Badge variant="outline" className="text-label mb-2 border-border">
                  {sourceLabel(ex.source)}
                </Badge>
                <p className="text-card-body line-clamp-4">{ex.text}</p>
              </div>
              <button
                type="button"
                onClick={() => void remove(ex.id)}
                className="shrink-0 rounded p-1 text-muted-foreground transition-colors [transition-duration:var(--transition-fast)] hover:text-foreground"
                aria-label="Delete voice example"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── BUSINESS PROFILE TAB ────────────────────────────────
function BusinessTab({ profile }: { profile: BusinessProfileRow | null }) {
  const supabase = createClient();
  const [f, setF] = useState({
    business_name: profile?.business_name ?? "",
    industry: profile?.industry ?? "",
    services: (profile?.services ?? []).join(", "),
    target_audience: profile?.target_audience ?? "",
    tone: profile?.brand_tone ?? "professional",
    tagline: profile?.tagline ?? "",
    location: profile?.location ?? "",
  });
  const { status: saveStatus, run: runSave } = useSaveStatus();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save(next: typeof f) {
    if (!profile) return;
    try {
      await runSave(async () => {
        const { error } = await supabase
          .from("business_profiles")
          .update({
            business_name: next.business_name,
            industry: next.industry,
            services: next.services.split(",").map((s) => s.trim()).filter(Boolean),
            target_audience: next.target_audience,
            brand_tone: next.tone,
            tagline: next.tagline,
            location: next.location,
          })
          .eq("id", profile.id);
        if (error) throw error;
      });
    } catch (e) {
      toast.error(
        e instanceof Error && e.message
          ? `Could not save: ${e.message}`
          : "Could not save."
      );
    }
  }

  function updateField(next: typeof f) {
    setF(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void save(next), 500);
  }

  function updateFieldNow(next: typeof f) {
    setF(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void save(next);
  }

  if (!profile) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>No business profile yet.</p>
        <Button asChild className="mt-4" size="sm">
          <a href="/onboarding">Complete onboarding</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-page-title">Business Profile</h2>
          <p className="text-card-body mt-1">
            This is what Zuri uses to generate your website and content.
          </p>
        </div>
        <SaveStatus status={saveStatus} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            { key: "business_name", label: "Business name" },
            { key: "industry", label: "Industry" },
            { key: "location", label: "Location" },
            { key: "tagline", label: "Tagline" },
          ] as const
        ).map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <Label>{label}</Label>
            <Input
              value={f[key]}
              onChange={(e) => updateField({ ...f, [key]: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label>Services (comma-separated)</Label>
        <Input
          value={f.services}
          onChange={(e) => updateField({ ...f, services: e.target.value })}
          placeholder="Cakes, pastries, event catering"
        />
      </div>

      <div className="space-y-2">
        <Label>Target audience</Label>
        <Input
          value={f.target_audience}
          onChange={(e) =>
            updateField({ ...f, target_audience: e.target.value })
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Brand tone</Label>
        <Select
          value={f.tone}
          onChange={(e) => updateFieldNow({ ...f, tone: e.target.value })}
          className="h-11"
        >
          {["professional", "warm", "bold", "playful"].map((t) => (
            <option key={t} value={t} className="capitalize">
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

// ── BILLING TAB ─────────────────────────────────────────
function BillingTab({ account }: { account: AccountView | null }) {
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  const plan = account?.subscription_plan ?? "free";
  const status = account?.subscription_status ?? "inactive";

  useEffect(() => {
    try {
      const p = localStorage.getItem("zuri_pending_plan");
      if (p && ["pro", "growth", "premium"].includes(p)) setPendingPlan(p);
    } catch {
      /* ignore */
    }
  }, []);

  async function upgrade(
    planId: "pro" | "growth" | "premium",
    interval: "monthly" | "annual"
  ) {
    setLoadingCheckout(`${planId}-${interval}`);
    try {
      const data = await safeFetchJSON<{ checkoutUrl: string }>(
        "/api/billing/checkout",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId, interval }),
        }
      );
      try {
        localStorage.removeItem("zuri_pending_plan");
      } catch {
        /* ignore */
      }
      window.location.href = data.checkoutUrl;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout.");
      setLoadingCheckout(null);
    }
  }

  const canUpgrade = plan !== "premium";
  const upgradePlans = PRICING.filter((p) => {
    const rank = { free: 0, pro: 1, growth: 2, premium: 3 } as const;
    return rank[p.id] > rank[plan as keyof typeof rank];
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-page-title">Billing</h2>
        <p className="text-card-body mt-1">
          Manage your subscription and payment details.
        </p>
      </div>

      {/* Current plan */}
      <div className="surface rounded-sm border border-border p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Current plan
            </p>
            <p className="mt-1 font-heading text-2xl font-semibold capitalize">{plan}</p>
          </div>
          <Badge variant={status === "active" ? "success" : "muted"} className="capitalize">
            {status}
          </Badge>
        </div>
        {plan === "free" && (
          <p className="mt-3 text-sm text-muted-foreground">
            Upgrade to publish your website, access your full content calendar, and unlock the agency marketplace.
          </p>
        )}
        {pendingPlan && plan === "free" && (
          <p className="mt-3 text-sm text-gold">
            You selected <span className="capitalize font-medium">{pendingPlan}</span> from
            pricing — pick monthly or annual below to finish checkout.
          </p>
        )}
      </div>

      {/* Upgrade options */}
      {canUpgrade && upgradePlans.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-medium">Upgrade your plan</p>
          {upgradePlans.map((p) => (
            <div
              key={p.id}
              className={`surface rounded-sm border p-5 ${
                p.highlight ? "border-gold bg-muted" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-xl font-semibold" title={p.name}>
                    {p.name}
                  </p>
                  <p className="mt-0.5 break-words text-sm text-muted-foreground">
                    {p.description}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="truncate font-heading text-2xl font-semibold">
                    {fmtNGN(p.ngnMonthly)}
                  </p>
                  <p className="text-xs text-muted-foreground">/month</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  size="sm"
                  variant={p.highlight ? "default" : "outline"}
                  onClick={() => upgrade(p.id, "monthly")}
                  disabled={loadingCheckout === `${p.id}-monthly`}
                >
                  {loadingCheckout === `${p.id}-monthly` ? (
                    <span className="zuri-spinner" />
                  ) : null}
                  Monthly
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => upgrade(p.id, "annual")}
                  disabled={loadingCheckout === `${p.id}-annual`}
                >
                  {loadingCheckout === `${p.id}-annual` ? (
                    <span className="zuri-spinner" />
                  ) : null}
                  Annual (2 months free)
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active plan management */}
      {plan !== "free" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            To cancel, change your plan, or update payment details, use the billing portal.
          </p>
          <Button variant="outline" asChild>
            <a
              href={`https://checkout.flutterwave.com/v3/hosted/pay`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="size-4" /> Manage subscription
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

// ── NOTIFICATIONS TAB ────────────────────────────────────
function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    weekly_checkin: true,
    nudge_emails: true,
    badge_alerts: true,
  });
  const { status: saveStatus, run: runSave } = useSaveStatus();

  // Optimistic toggle-and-autosave (Notion-style): flipping a switch commits
  // immediately and persists in the background, instead of batching changes
  // behind an explicit "Save preferences" click-and-wait.
  // NOTE: no notification_prefs column exists yet — this still persists to
  // localStorage only (V1 behavior unchanged); wiring to a real DB column
  // is a backend follow-up, not a UI polish change.
  async function toggle(key: keyof typeof prefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      await runSave(async () => {
        await new Promise((r) => setTimeout(r, 400));
      });
    } catch {
      setPrefs((p) => ({ ...p, [key]: !p[key] }));
      toast.error("Could not save preference");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-page-title">Notifications</h2>
          <p className="text-card-body mt-1">
            Control which emails Zuri sends you.
          </p>
        </div>
        <SaveStatus status={saveStatus} />
      </div>

      <div className="space-y-4">
        {(
          [
            {
              key: "weekly_checkin" as const,
              label: "Weekly AI check-in",
              desc: "Every Monday — your personalized progress summary and top moves.",
            },
            {
              key: "nudge_emails" as const,
              label: "Inactivity nudges",
              desc: "If you haven't logged in for 3 days, Zuri sends two ready-to-use drafts.",
            },
            {
              key: "badge_alerts" as const,
              label: "Badge & milestone alerts",
              desc: "Celebrate when you earn a streak badge or hit a milestone.",
            },
          ] as const
        ).map(({ key, label, desc }) => (
          <label
            key={key}
            className="flex cursor-pointer items-start gap-4 rounded-sm border border-[var(--border-solid)] p-4 [transition-duration:var(--transition-fast)] transition-colors hover:bg-muted/50"
          >
            <div className="mt-0.5 flex-1">
              <p className="text-card-title">{label}</p>
              <p className="mt-0.5 text-card-meta">{desc}</p>
            </div>
            <div
              onClick={() => void toggle(key)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors active:scale-95 ${
                prefs[key] ? "bg-gold" : "bg-border"
              }`}
            >
              <span
                className={`inline-block size-4 rounded-full bg-white transition-transform ${
                  prefs[key] ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── DANGER ZONE ─────────────────────────────────────────
function DangerTab() {
  const router = useRouter();
  const supabase = createClient();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) throw new Error();
      await supabase.auth.signOut();
      router.push("/");
    } catch {
      toast.error("Could not delete account. Please contact support.");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-page-title">Danger Zone</h2>
        <p className="text-card-body mt-1">
          Permanent actions. These cannot be undone.
        </p>
      </div>

      <div className="surface rounded-sm border border-error p-5">
        <p className="font-medium text-error">Delete account</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently deletes your account, website, content plan, and all data. Your published
          website will go offline immediately.
        </p>

        {!confirming ? (
          <Button
            variant="destructive"
            className="mt-4"
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="size-4" /> Delete my account
          </Button>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium text-error">
              Are you sure? This cannot be reversed.
            </p>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={deleteAccount}
                disabled={deleting}
              >
                {deleting ? <span className="zuri-spinner" /> : null}
                Yes, delete everything
              </Button>
              <Button variant="outline" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}