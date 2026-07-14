import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "About Zuri" };

export default function AboutPage() {
  return (
    <div className="zuri-container py-20 md:py-28">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs uppercase tracking-widest text-gold">About</p>
        <h1 className="mt-4 font-heading text-4xl font-semibold md:text-6xl">
          Built for Africa's entrepreneurs.
        </h1>

        <div className="mt-12 space-y-8 text-lg text-muted-foreground">
          <p>
            Nigeria has 44 million small businesses. The vast majority have no online presence —
            not because the owners don't want one, but because the tools that exist were built for
            someone else, somewhere else.
          </p>
          <p>
            Zuri is different. It starts where African business owners actually are: with a
            conversation. You describe your business — in your words, at your pace — and Zuri turns
            it into a live premium website, a 90-day growth plan, and a daily content companion, all
            in under ten minutes.
          </p>
          <p>
            We price in Naira first. We accept Naira, Cedis, Shillings, Rand, and 30 more African
            currencies. We built for mobile because that's how Africa works. We chose a warm gold
            on near-black — premium, confident, distinctly ours.
          </p>
          <p>
            Zuri is built as an entry for the{" "}
            <strong className="text-foreground">XPRIZE Build with Gemini 2026</strong> competition
            — a challenge to build AI-powered professional services tools that create real economic
            impact. Every part of Zuri's intelligence is powered by Gemini: brand extraction,
            website composition, content drafting, 90-day planning, and weekly accountability.
          </p>
          <p className="font-medium text-foreground">
            The problem is real. The market is enormous. The technology is ready.
            <br />
            Zuri is what happens when you put all three together.
          </p>
        </div>

        <div className="mt-14 rounded-2xl border border-border bg-surface p-8">
          <p className="text-xs uppercase tracking-widest text-gold">The stack</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Next.js 15 · Supabase · Gemini 2.5 Pro + 2.0 Flash · Tailwind CSS · Framer Motion ·
            Flutterwave · Vercel · Resend · Unsplash · Pexels
          </p>
        </div>

        <div className="mt-10">
          <Button asChild>
            <Link href="/signup">Start building</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}