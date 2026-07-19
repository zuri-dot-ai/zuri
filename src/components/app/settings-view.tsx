"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  User,
  Building2,
  CreditCard,
  Bell,
  Trash2,
  Save,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { PRICING } from "@/lib/constants";
import { formatNGN as fmtNGN } from "@/lib/utils";
import type { AccountView, BusinessProfileRow } from "@/types/database";

type Tab = "profile" | "business" | "billing" | "notifications" | "danger";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "business", label: "Business Profile", icon: Building2 },
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
              className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm font-medium transition-colors ${
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
  const supabase = createClient();
  const [name, setName] = useState(account?.full_name ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name, updated_at: new Date().toISOString() })
      .eq("id", account!.id);
    setSaving(false);
    if (error) return toast.error("Could not save profile.");
    toast.success("Profile updated.");
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-2xl font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
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
          <Label>Full name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
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

      <Button onClick={save} disabled={saving}>
        {saving ? <span className="zuri-spinner" /> : <Save className="size-4" />}
        Save changes
      </Button>
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
    tone: profile?.tone ?? "professional",
    tagline: profile?.tagline ?? "",
    location: profile?.location ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("business_profiles")
      .update({
        business_name: f.business_name,
        industry: f.industry,
        services: f.services.split(",").map((s) => s.trim()).filter(Boolean),
        target_audience: f.target_audience,
        tone: f.tone,
        tagline: f.tagline,
        location: f.location,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) return toast.error("Could not save.");
    toast.success("Business profile updated.");
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
      <div>
        <h2 className="font-heading text-2xl font-semibold">Business Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This is what Zuri uses to generate your website and content.
        </p>
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
              onChange={(e) => setF({ ...f, [key]: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label>Services (comma-separated)</Label>
        <Input
          value={f.services}
          onChange={(e) => setF({ ...f, services: e.target.value })}
          placeholder="Cakes, pastries, event catering"
        />
      </div>

      <div className="space-y-2">
        <Label>Target audience</Label>
        <Input
          value={f.target_audience}
          onChange={(e) => setF({ ...f, target_audience: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Brand tone</Label>
        <select
          value={f.tone}
          onChange={(e) => setF({ ...f, tone: e.target.value })}
          className="flex h-11 w-full rounded-sm border border-border bg-background px-4 text-sm focus:border-gold/60 focus:outline-none"
        >
          {["professional", "warm", "bold", "playful"].map((t) => (
            <option key={t} value={t} className="capitalize">
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? <span className="zuri-spinner" /> : <Save className="size-4" />}
        Save changes
      </Button>
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
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, interval }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
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
        <h2 className="font-heading text-2xl font-semibold">Billing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
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
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-heading text-xl font-semibold">{p.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{p.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-heading text-2xl font-semibold">
                    {fmtNGN(p.ngnMonthly)}
                  </p>
                  <p className="text-xs text-muted-foreground">/month</p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
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
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    // In V1 these prefs are stored client-side only; wire to DB in V2
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    toast.success("Notification preferences saved.");
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-2xl font-semibold">Notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Control which emails Zuri sends you.
        </p>
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
            className="flex cursor-pointer items-start gap-4 rounded-sm border border-border p-4 transition-colors hover:bg-muted/50"
          >
            <div className="mt-0.5 flex-1">
              <p className="font-medium">{label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
            </div>
            <div
              onClick={() => setPrefs((p) => ({ ...p, [key]: !p[key] }))}
              className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors ${
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

      <Button onClick={save} disabled={saving}>
        {saving ? <span className="zuri-spinner" /> : <Save className="size-4" />}
        Save preferences
      </Button>
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
        <h2 className="font-heading text-2xl font-semibold">Danger Zone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
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