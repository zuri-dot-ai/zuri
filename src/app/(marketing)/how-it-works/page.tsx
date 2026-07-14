import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "How It Works" };

const ACTS = [
  {
    act: "Step 1",
    title: "Have a conversation",
    body: "Tell Zuri about your business — by voice, by typing, or through a quick form. Zuri asks what matters: your name, what you do, who you serve, and what makes you different.",
    detail:
      "Gemini 2.5 Pro listens to everything you share and extracts a complete brand profile — industry, tone, services, target audience, tagline. You review it and confirm. The whole thing takes less than three minutes.",
    visual: "🎙️",
  },
  {
    act: "Step 2",
    title: "Get your website live",
    body: "Gemini composes a full premium website from your conversation. You choose a style mood, confirm the layout, and publish to your own subdomain.",
    detail:
      "The website composer selects from 30+ premium block variants — heroes, about sections, service grids, testimonials, CTAs — writes all the copy, picks a colour palette, and fetches real photography from Unsplash. From conversation to live URL in under 10 minutes.",
    visual: "🌐",
  },
  {
    act: "Step 3",
    title: "Follow your plan",
    body: "Every morning, your dashboard shows today's task with an AI-prepared asset ready to use. Post it, mark it done, build your streak.",
    detail:
      "Your 90-day action plan has 13 weekly themes — from foundation to conversion — each day structured with a specific task, the reason it matters, and a ready-to-use draft. Canva deep-links, video scripts, and weekly AI coach messages keep you moving long after the initial excitement fades.",
    visual: "📅",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="zuri-container py-20 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs uppercase tracking-widest text-gold">How it works</p>
        <h1 className="mt-4 font-heading text-4xl font-semibold md:text-6xl">
          Three acts. Ten minutes.
        </h1>
        <p className="mt-4 text-muted-foreground">
          Zuri is designed to get an African business owner from zero to a real online presence
          faster than any tool that existed before it.
        </p>
      </div>

      <div className="mt-20 space-y-24">
        {ACTS.map(({ act, title, body, detail, visual }, i) => (
          <div
            key={act}
            className={`grid items-center gap-10 md:grid-cols-2 ${
              i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
            }`}
          >
            {/* Text */}
            <div>
              <p className="text-xs uppercase tracking-widest text-gold">{act}</p>
              <h2 className="mt-3 font-heading text-4xl font-semibold">{title}</h2>
              <p className="mt-4 text-lg text-muted-foreground">{body}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{detail}</p>
            </div>

            {/* Visual placeholder (swap for a screenshot when ready) */}
            <div className="flex aspect-video items-center justify-center rounded-2xl border border-border bg-surface text-6xl">
              {visual}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-24 rounded-2xl border border-gold/30 bg-gold/5 p-12 text-center">
        <h2 className="font-heading text-4xl font-semibold">
          Your business, online.{" "}
          <span className="text-gold-gradient">Beautifully.</span>
        </h2>
        <Button asChild size="lg" className="mt-7">
          <Link href="/signup">Start building — free</Link>
        </Button>
      </div>
    </div>
  );
}