import type { Metadata } from "next";
import { BentoGrid } from "@/components/marketing/bento-grid";

export const metadata: Metadata = { title: "Features" };

export default function FeaturesPage() {
  return (
    <div className="zuri-container py-20 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs uppercase tracking-widest text-gold">Features</p>
        <h1 className="mt-4 font-heading text-4xl font-semibold md:text-6xl">
          One platform. Four pillars.
        </h1>
        <p className="mt-4 text-muted-foreground">
          Every tool a Nigerian business owner needs to establish, grow, and sustain
          their online presence — powered by Gemini AI.
        </p>
      </div>
      <BentoGrid />
    </div>
  );
}