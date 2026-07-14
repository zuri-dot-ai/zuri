"use client";

import { motion } from "framer-motion";
import { Globe, PenLine, CalendarCheck, Users, TrendingUp, Zap } from "lucide-react";

const CARDS = [
  {
    icon: Globe,
    title: "Website Generator",
    desc: "Gemini 2.5 Pro composes a premium, fully-written, fully-designed website from a single conversation. Chooses layout, copy, imagery, and motion style — tailored to your exact business.",
    span: "md:col-span-2",
    accent: true,
  },
  {
    icon: CalendarCheck,
    title: "90-Day Action Plan",
    desc: "A personalized day-by-day growth roadmap with AI-prepared assets ready to use each day. Streaks and badges keep you consistent.",
    span: "",
    accent: false,
  },
  {
    icon: PenLine,
    title: "Content Studio",
    desc: "Daily AI-drafted captions, newsletters, and video scripts for Instagram, LinkedIn, TikTok, and email — with direct Canva deep-links.",
    span: "",
    accent: false,
  },
  {
    icon: TrendingUp,
    title: "Progress Tracker",
    desc: "Streak counts, weekly completion rings, and milestone badges that turn consistency into a habit.",
    span: "",
    accent: false,
  },
  {
    icon: Users,
    title: "Agency Marketplace",
    desc: "When you need human execution, Zuri matches you to vetted Nigerian agencies. Gemini writes the brief automatically from your brand profile.",
    span: "md:col-span-2",
    accent: false,
  },
  {
    icon: Zap,
    title: "AI Accountability Coach",
    desc: "Every Monday, a personalized check-in lands in your inbox — celebrating wins, surfacing your three highest-impact moves for the week ahead.",
    span: "",
    accent: false,
  },
];

export function BentoGrid() {
  return (
    <div className="mt-14 grid auto-rows-fr gap-4 md:grid-cols-3">
      {CARDS.map(({ icon: Icon, title, desc, span, accent }, i) => (
        <motion.div
          key={title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: i * 0.07, ease: [0.25, 0.1, 0.25, 1] }}
          className={`zuri-card flex flex-col ${span} ${accent ? "border-gold/30 bg-gradient-to-br from-surface to-gold/[0.04]" : ""}`}
        >
          <div
            className={`flex size-11 items-center justify-center rounded-lg ${
              accent ? "bg-gold text-background" : "bg-gold/10 text-gold"
            }`}
          >
            <Icon className="size-5" />
          </div>
          <h3 className="mt-5 font-heading text-xl font-semibold">{title}</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
        </motion.div>
      ))}
    </div>
  );
}