# ZURI — Claude Code Context

> Paste this at the start of every Claude Code session.

## PROJECT
Zuri — AI presence activation system for African business owners.
Tagline: "Your business, online. Beautifully."
Takes a business owner from zero online presence to a live premium
website + 90-day content action plan + vetted agency partners,
starting from a single conversation.

## COMPETITION
XPRIZE Build with Gemini 2026 — Professional Services category.
Build window: May 19 – Aug 17, 2026. Finals: Sept 25, Los Angeles.
Gemini MUST visibly power: brand extraction, website composition,
content drafting, 90-day plan generation, weekly AI check-in.

## STACK
- Next.js 15 (App Router, RSC, Turbopack)
- TypeScript (strict)
- Tailwind CSS + shadcn/ui (new-york style)
- Framer Motion (animations)
- Supabase (Postgres, Auth, Storage, RLS)
- Gemini API (@google/generative-ai): 2.0 Flash + 2.5 Pro
- Flutterwave (NGN-first subscriptions)
- Resend (platform emails)
- Unsplash + Pexels (media), Canva deep-links
- Remotion (video, Week 8+)
- Vercel (hosting + wildcard subdomains)

## BRAND TOKENS
- Dark mode ONLY in V1
- Background #0C0C0E | Surface #161618 | Border #2A2A2D
- Text #F0EEE9 | Muted #888891
- Gold accent #C9A84C (hover #E2BC5A)
- Success #3D9970 | Error #C0392B
- Headings: Cormorant Garamond (font-heading)
- Body/UI: Inter (font-sans)
- Data: JetBrains Mono (font-mono)
- Tailwind aliases: bg-background, bg-surface, text-foreground,
  text-muted-foreground, border-border, text-gold, bg-gold
- Motion tokens: slow-elegant / crisp-modern / bold-energetic

## MARKET
Nigeria-first. NGN displayed PRIMARY, USD secondary (small, grey).
Mobile AND desktop must be pixel-perfect equally.

## PRICING
- Starter: ₦38,000/mo ($25) — site + 90-day plan + weekly drafts + tracker
- Growth: ₦61,000/mo ($40) — + daily drafts + video + agency access + AI coach
- Annual: 2 months free. Early adopter: ₦25,000/mo locked for life (first 10).

## FOUR PILLARS
1. Website Generator (Gemini composes premium site from convo)
2. Content Studio (drafts posts, email, video)
3. Action Plan (90-day day-by-day tasks + streaks + badges)
4. Agency Marketplace (vetted partners matched to brief)

## DATABASE
See /supabase/schema.sql — 9 tables:
users, business_profiles, websites, content_calendar,
action_plan_tasks, user_progress, agencies, agency_match_requests,
platform_connections.

## SESSION RULES
- ONE feature per session. Plan mode FIRST before writing code.
- Commit to GitHub after every working feature.
- Keep sessions under 90 minutes.
- Sonnet for everyday coding, Opus for architecture.
- Respect path alias: @/* → src/*

## CURRENT TASK
[Describe the specific feature you're building this session]