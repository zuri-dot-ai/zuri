"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { createClient } from "@/lib/supabase/client";
import {
  PLAN_CONFIG,
  PLAN_RANK,
  type PlanId,
} from "@/lib/payments/plans";
import { cn, formatNGN } from "@/lib/utils";

type BillingCycle = "monthly" | "annual";
type CtaKind = "current" | "trial" | "upgrade" | "downgrade" | "signup";

interface PlanCardCopy {
  id: PlanId;
  blurb: string;
  highlights: string[];
  popular?: boolean;
}

const PLAN_CARDS: PlanCardCopy[] = [
  {
    id: "free",
    blurb: "Preview your brand and explore Zuri before you commit.",
    highlights: [
      "1 brand profile",
      "Website preview only",
      "5 content ideas / month",
      "50 MB storage",
      "Community support",
    ],
  },
  {
    id: "pro",
    blurb: "Get online with a deployable site and monthly content.",
    highlights: [
      "1 deployable website",
      "12 calendar posts / month",
      "15 AI images / month",
      "Website analytics (30 days)",
      "Email support (48h)",
    ],
  },
  {
    id: "growth",
    blurb: "Scale with custom domains, more generation, and agency access.",
    highlights: [
      "Custom domain",
      "30 calendar posts / month",
      "50 AI images / month",
      "Meta + Search Console analytics",
      "Agency marketplace access",
      "Remove Zuri branding",
    ],
    popular: true,
  },
  {
    id: "premium",
    blurb: "Full power — multi-site, seats, API, and priority everything.",
    highlights: [
      "3 websites + all custom domains",
      "Unlimited posts & blog generation",
      "200 AI images / month",
      "3 seats + API access",
      "Featured agency listing",
      "Dedicated account manager",
    ],
  },
];

interface ComparisonRow {
  label: string;
  values: Record<PlanId, string | boolean>;
}

const COMPARISON: ComparisonRow[] = [
  {
    label: "Brand profiles",
    values: { free: "1", pro: "1", growth: "1", premium: "3" },
  },
  {
    label: "Deployable websites",
    values: { free: "Preview", pro: "1", growth: "1", premium: "3" },
  },
  {
    label: "Custom domain",
    values: { free: false, pro: false, growth: true, premium: true },
  },
  {
    label: "Website regenerations / month",
    values: { free: "0", pro: "1", growth: "3", premium: "Unlimited" },
  },
  {
    label: "Calendar posts / month",
    values: { free: "0", pro: "12", growth: "30", premium: "Unlimited" },
  },
  {
    label: "AI images / month",
    values: { free: "0", pro: "15", growth: "50", premium: "200" },
  },
  {
    label: "Blog posts / month",
    values: { free: "0", pro: "2", growth: "6", premium: "Unlimited" },
  },
  {
    label: "Analytics",
    values: { free: false, pro: true, growth: true, premium: true },
  },
  {
    label: "Agency marketplace",
    values: { free: false, pro: false, growth: true, premium: true },
  },
  {
    label: "Storage",
    values: { free: "50 MB", pro: "500 MB", growth: "2 GB", premium: "10 GB" },
  },
  {
    label: "User seats",
    values: { free: "1", pro: "1", growth: "1", premium: "3" },
  },
  {
    label: "API access",
    values: { free: false, pro: false, growth: false, premium: true },
  },
];

const FAQS = [
  {
    q: "Is there a free trial?",
    a: "Yes. Pro, Growth, and Premium include a 7-day free trial. Your card is required at checkout; you are not charged until day 7. Cancel before then and you stay on Free.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancellation takes effect at the end of your current billing period. You keep full access until then.",
  },
  {
    q: "What happens if I downgrade?",
    a: "Downgrades are never immediate — they schedule for the end of your paid period. You keep your current plan’s features until that date.",
  },
  {
    q: "Do prices include VAT?",
    a: "Prices are shown in NGN. Flutterwave does not auto-apply VAT for Nigerian merchants; tax compliance is in progress. We’ll update checkout if FIRS requirements change.",
  },
  {
    q: "What about custom / complex sites?",
    a: "Branches for complex e-commerce or CMS builds redirect to our Custom Site contact flow on every plan, including Premium. We’ll match you with the right build path.",
  },
];

function resolveCta(
  cardId: PlanId,
  currentPlanId: PlanId,
  isAuthenticated: boolean
): CtaKind {
  if (!isAuthenticated) {
    if (cardId === "free") return "signup";
    return "signup";
  }
  if (cardId === currentPlanId) return "current";
  if (PLAN_RANK[cardId] > PLAN_RANK[currentPlanId]) {
    return currentPlanId === "free" ? "trial" : "upgrade";
  }
  return "downgrade";
}

function ctaLabel(kind: CtaKind): string {
  switch (kind) {
    case "current":
      return "Current plan";
    case "trial":
      return "Start free trial";
    case "upgrade":
      return "Upgrade";
    case "downgrade":
      return "Downgrade";
    case "signup":
      return "Get started";
  }
}

export function PricingPageClient() {
  const { planId, isLoading } = useSubscription();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsAuthenticated(!!data.user);
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "cancelled") {
      setNotice("Your payment was not completed. Your plan hasn't changed.");
    } else if (payment === "failed") {
      setNotice("We couldn't verify your payment. Please try again or contact support.");
    }
  }, []);

  function initiatePayment(targetPlan: PlanId) {
    if (targetPlan === "free") return;
    setError(null);
    setPendingPlan(targetPlan);

    startTransition(async () => {
      try {
        const res = await fetch("/api/payments/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: targetPlan, billingCycle }),
        });
        const data = await res.json();
        if (!res.ok || !data.payment_link) {
          setError(
            data.error ||
              "Payment service is temporarily unavailable. Please try again in a few minutes."
          );
          setPendingPlan(null);
          return;
        }
        window.location.href = data.payment_link;
      } catch {
        setError("Something went wrong. Please try again.");
        setPendingPlan(null);
      }
    });
  }

  return (
    <div className="zuri-container py-20 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs uppercase tracking-widest text-gold">Pricing</p>
        <h1 className="mt-4 font-heading text-4xl font-semibold md:text-6xl">
          Simple, honest pricing.
        </h1>
        <p className="mt-4 text-muted-foreground">
          Pay in Naira. 7-day free trial on paid plans. Two months free on annual.
        </p>
      </div>

      {/* Monthly / Annual toggle */}
      <div className="mt-10 flex flex-col items-center gap-3">
        <div className="inline-flex rounded-lg border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              billingCycle === "monthly"
                ? "bg-gold text-background"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("annual")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              billingCycle === "annual"
                ? "bg-gold text-background"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Annual
          </button>
        </div>
        {billingCycle === "annual" && (
          <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
            Save 2 months free
          </span>
        )}
      </div>

      {notice && (
        <p className="mx-auto mt-6 max-w-xl rounded-lg border border-border bg-surface px-4 py-3 text-center text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      {error && (
        <p className="mx-auto mt-4 max-w-xl rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-center text-sm text-error">
          {error}
        </p>
      )}

      {/* Plan cards */}
      <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_CARDS.map((card) => {
          const plan = PLAN_CONFIG[card.id];
          const price =
            billingCycle === "annual"
              ? Math.round(plan.price_annual / 12)
              : plan.price_monthly;
          const kind = resolveCta(card.id, planId, isAuthenticated);
          const busy = isPending && pendingPlan === card.id;
          const disabled =
            kind === "current" ||
            kind === "downgrade" ||
            isLoading ||
            busy ||
            (isPending && pendingPlan !== null);

          return (
            <div
              key={card.id}
              className={cn(
                "zuri-card flex flex-col",
                card.popular &&
                  "border-gold/50 bg-gradient-to-b from-surface to-gold/[0.04]"
              )}
            >
              {card.popular && (
                <span className="mb-4 w-fit rounded-full bg-gold px-3 py-0.5 text-xs font-semibold text-background">
                  Most Popular
                </span>
              )}
              <h2 className="font-heading text-3xl font-semibold">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{card.blurb}</p>

              <div className="mt-6">
                <span className="font-heading text-4xl font-semibold">
                  {formatNGN(price)}
                </span>
                <span className="ml-1 text-muted-foreground">/month</span>
                {billingCycle === "annual" && plan.price_annual > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatNGN(plan.price_annual)} billed annually
                  </p>
                )}
                {card.id !== "free" && billingCycle === "monthly" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    or {formatNGN(plan.price_annual)}/year
                  </p>
                )}
              </div>

              {kind === "signup" ? (
                <Button
                  asChild
                  variant={card.popular ? "default" : "outline"}
                  className="mt-7"
                >
                  <Link href="/signup">{ctaLabel(kind)}</Link>
                </Button>
              ) : (
                <Button
                  variant={card.popular && kind !== "current" ? "default" : "outline"}
                  className="mt-7"
                  disabled={disabled}
                  title={
                    kind === "downgrade"
                      ? "Takes effect at end of billing period"
                      : undefined
                  }
                  onClick={() => {
                    if (kind === "trial" || kind === "upgrade") {
                      initiatePayment(card.id);
                    }
                  }}
                >
                  {busy ? "Redirecting…" : ctaLabel(kind)}
                </Button>
              )}

              <ul className="mt-7 space-y-3">
                {card.highlights.map((text) => (
                  <li key={text} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Feature comparison */}
      <div className="mx-auto mt-20 max-w-6xl">
        <button
          type="button"
          className="flex w-full items-center justify-between border-b border-border pb-4 text-left md:cursor-default"
          onClick={() => setComparisonOpen((o) => !o)}
        >
          <h2 className="font-heading text-3xl font-semibold">Compare features</h2>
          <ChevronDown
            className={cn(
              "size-5 text-muted-foreground transition-transform md:hidden",
              comparisonOpen && "rotate-180"
            )}
          />
        </button>

        <div
          className={cn(
            "mt-6 overflow-x-auto",
            !comparisonOpen && "hidden md:block"
          )}
        >
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  Feature
                </th>
                {(["free", "pro", "growth", "premium"] as PlanId[]).map((id) => (
                  <th key={id} className="px-3 py-3 font-heading text-base font-semibold">
                    {PLAN_CONFIG[id].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.label} className="border-b border-border/60">
                  <td className="py-3 pr-4 text-muted-foreground">{row.label}</td>
                  {(["free", "pro", "growth", "premium"] as PlanId[]).map((id) => {
                    const val = row.values[id];
                    return (
                      <td key={id} className="px-3 py-3">
                        {typeof val === "boolean" ? (
                          val ? (
                            <Check className="size-4 text-success" />
                          ) : (
                            <X className="size-4 text-muted-foreground/40" />
                          )
                        ) : (
                          <span>{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="mx-auto mt-20 max-w-2xl space-y-5">
        <h2 className="font-heading text-3xl font-semibold">Questions</h2>
        {FAQS.map(({ q, a }) => (
          <div key={q} className="rounded-xl border border-border bg-surface p-5">
            <p className="font-medium">{q}</p>
            <p className="mt-2 text-sm text-muted-foreground">{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
