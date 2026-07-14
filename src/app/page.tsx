import Link from "next/link";
import { HeroWordSwap } from "@/components/marketing/hero-word-swap";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/partners", label: "Partners" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Standalone nav for the home page (outside marketing layout) */}
      <header className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="zuri-container flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm md:flex">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className="text-muted-foreground hover:text-foreground transition-colors">
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm text-muted-foreground hover:text-foreground md:inline">
              Sign in
            </Link>
            <Button asChild size="sm">
              <Link href="/signup">Build your presence</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-16">
        {/* ── HERO ─────────────────────────────────────── */}
        <HeroWordSwap />

        {/* ── PROBLEM STRIP (3 stats) ───────────────────── */}
        <section className="border-y border-border bg-surface">
          <div className="zuri-container grid gap-8 py-14 md:grid-cols-3 md:py-16">
            {[
              { stat: "44M+", label: "SMEs in Nigeria with zero digital presence" },
              { stat: "2 weeks", label: "Average time before most owners give up" },
              { stat: "₦0", label: "Revenue from a business no one can find online" },
            ].map(({ stat, label }) => (
              <div key={stat} className="text-center md:text-left">
                <p className="font-heading text-4xl font-semibold text-gold md:text-5xl">{stat}</p>
                <p className="mt-2 text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS (3-step) ─────────────────────── */}
        <section className="zuri-container py-24 md:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs uppercase tracking-widest text-gold">How it works</p>
            <h2 className="mt-4 font-heading text-4xl font-semibold md:text-5xl">
              From conversation to live website in under 10 minutes
            </h2>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Tell Zuri about your business",
                desc: "Speak, type, or fill a quick form. Zuri extracts your brand identity — name, industry, tone, and what makes you different.",
              },
              {
                step: "02",
                title: "Get your website live",
                desc: "Gemini composes a full premium website from your conversation. Choose a style, confirm the preview, publish to your own subdomain.",
              },
              {
                step: "03",
                title: "Follow your 90-day plan",
                desc: "Every day, a ready-to-use content draft is waiting for you. Complete tasks, build streaks, and watch your presence grow.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="zuri-card relative overflow-hidden">
                <span className="font-heading text-6xl font-semibold text-border">{step}</span>
                <h3 className="mt-4 font-heading text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── PILLARS (4 product features) ──────────────── */}
        <section className="bg-surface py-24">
          <div className="zuri-container">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs uppercase tracking-widest text-gold">The four pillars</p>
              <h2 className="mt-4 font-heading text-4xl font-semibold md:text-5xl">
                Everything you need. Nothing you don't.
              </h2>
            </div>
            <div className="mt-16 grid gap-5 md:grid-cols-2">
              {[
                {
                  emoji: "🌐",
                  title: "Website Generator",
                  desc: "Gemini composes a premium, fully-written website from a single conversation. Live on your own subdomain in minutes.",
                  badge: "All plans",
                },
                {
                  emoji: "✍️",
                  title: "Content Studio",
                  desc: "AI-drafted posts, captions, newsletters, and video scripts — ready every day, for every platform you care about.",
                  badge: "All plans",
                },
                {
                  emoji: "📅",
                  title: "90-Day Action Plan",
                  desc: "A day-by-day roadmap built for your business. Complete tasks, earn badges, build streaks. Your coach never sleeps.",
                  badge: "All plans",
                },
                {
                  emoji: "🤝",
                  title: "Agency Marketplace",
                  desc: "When you need human hands, Zuri matches you to vetted execution partners and writes the brief automatically.",
                  badge: "Growth",
                },
              ].map(({ emoji, title, desc, badge }) => (
                <div key={title} className="rounded-xl border border-border bg-background p-7">
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{emoji}</span>
                    <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                      {badge}
                    </span>
                  </div>
                  <h3 className="mt-5 font-heading text-2xl font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF STRIP ────────────────────────── */}
        <section className="zuri-container py-20">
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
            Built for every kind of business
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 opacity-60">
            {["Bakeries", "Consultants", "Salons", "Lawyers", "Photographers", "Retailers", "Coaches", "Clinics"].map(
              (b) => (
                <span key={b} className="font-heading text-lg">{b}</span>
              )
            )}
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────── */}
        <section className="bg-surface py-28">
          <div className="zuri-container text-center">
            <h2 className="font-heading text-5xl font-semibold md:text-6xl">
              Your business, online.{" "}
              <span className="text-gold-gradient">Beautifully.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
              Join thousands of African entrepreneurs building their online presence with Zuri. Your website goes live in under 10 minutes.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link href="/signup">Build your presence — it's free to start</Link>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              No credit card required. Free tier available.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border">
          <div className="zuri-container flex flex-col items-center justify-between gap-6 py-10 md:flex-row">
            <Logo showMark={false} href="/" />
            <p className="text-center text-xs text-muted-foreground">
              Built for Africa's entrepreneurs. Powered by Gemini.
            </p>
            <div className="flex gap-6 text-xs text-muted-foreground">
              <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
              <Link href="/signup" className="hover:text-foreground">Get started</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}