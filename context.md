# ZURI FRONTEND OVERHAUL — COMPLETE MASTER PROMPT
# Paste this at the start of every Claude Code session for this refurbishment

## PROJECT CONTEXT
Zuri is an AI-powered business presence platform for African entrepreneurs.
Stack: Next.js 15 (App Router), Tailwind CSS, shadcn/ui, Framer Motion, Supabase, Gemini API.
Brand: Dark mode only. Near-black #0C0C0E background. Gold accent #C9A84C.
Current state: Functional but visually generic (3/10). Target: Premium luxury SaaS (9/10).
Reference bar: Squarespace, Lovable, Linear, Vercel — but warmer and African.

## ASSET FILES (already in /public folder)
- /public/Zuri_Logo.png — Full wordmark (metallic triangle icon + "ZURI" text, white/silver on black)
- /public/Zuri_Favicon.png — Triangle mark only (silver 3D metallic, transparent background)
- /public/hero-video.mp4 — Compressed looping hero video (user will add this file)
All images: use Next.js <Image> component with proper width/height props.

## TYPOGRAPHY SYSTEM (UPDATE EVERYWHERE)
Headings & Subheadings: Cormorant Garamond (keep current weights — 400, 500, 600, 700)
Body & UI text: Montserrat Regular (400) — replace Inter everywhere
Monospace/data: JetBrains Mono (keep)

Update src/app/layout.tsx fonts:
- Remove Inter import
- Add Montserrat: import { Montserrat, Cormorant_Garamond, JetBrains_Mono } from "next/font/google"
- Montserrat: subsets: ["latin"], variable: "--font-montserrat", weight: ["400","500","600"]
- Update CSS variable from --font-inter to --font-montserrat throughout
- Update tailwind.config.ts: sans: ["var(--font-montserrat)", "system-ui", "sans-serif"]

## ICON SYSTEM (NO EMOJIS ANYWHERE)
Replace ALL emojis in the entire codebase with Lucide React icons.
Complete emoji-to-icon mapping:
🌐 → <Globe />
✍️ → <PenLine />
📅 → <CalendarCheck />
🤝 → <Handshake />
🔥 → <Flame />
🏅 → <Medal />
💪 → <Dumbbell />
✨ → <Sparkles />
🏆 → <Trophy />
💼 → <Briefcase />
🏢 → <Building2 />
🎨 → <Palette />
🛍️ → <ShoppingBag />
🍽️ → <UtensilsCrossed />
💇 → <Scissors />
📊 → <BarChart3 />
📸 → <Camera />
🏠 → <Home />
🏋️ → <Dumbbell />
🎉 → <PartyPopper />
📷 → <Camera />
✉️ → <Mail />
👥 → <Users />
🎵 → <Music />
⚡ → <Zap />
🔒 → <Lock />
⭐ → <Star />
📍 → <MapPin />
🕐 → <Clock />
✓ → <Check />
❌ → <X />
🚀 → <Rocket />
💡 → <Lightbulb />
Search entire codebase for any remaining emoji characters and replace with appropriate Lucide icon.
Import all icons from "lucide-react".

## LOGO COMPONENT (REPLACE ENTIRELY)
Replace src/components/ui/logo.tsx completely:

```tsx
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  href?: string;
  showMark?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { logo: { width: 80, height: 24 }, mark: { width: 24, height: 24 } },
  md: { logo: { width: 120, height: 36 }, mark: { width: 36, height: 36 } },
  lg: { logo: { width: 160, height: 48 }, mark: { width: 48, height: 48 } },
};

export function Logo({ className, href = "/", showMark = false, size = "md" }: LogoProps) {
  const s = sizes[size];
  const content = (
    <span className={cn("inline-flex items-center", className)}>
      {showMark ? (
        <Image src="/Zuri_Favicon.png" alt="Zuri" width={s.mark.width} height={s.mark.height} className="object-contain" />
      ) : (
        <Image src="/Zuri_Logo.png" alt="Zuri" width={s.logo.width} height={s.logo.height} className="object-contain" />
      )}
    </span>
  );
  return href ? <Link href={href} aria-label="Zuri home">{content}</Link> : content;
}
```

## FAVICON (UPDATE)
In src/app/layout.tsx metadata:
```tsx
icons: {
  icon: "/Zuri_Favicon.png",
  apple: "/Zuri_Favicon.png",
  shortcut: "/Zuri_Favicon.png",
},
```
Create /public/manifest.json for PWA:
```json
{
  "name": "Zuri",
  "short_name": "Zuri",
  "description": "Your business, online. Beautifully.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0C0C0E",
  "theme_color": "#e6b739",
  "orientation": "portrait",
  "icons": [
    { "src": "/Zuri_Favicon.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/Zuri_Favicon.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```
Add to layout.tsx head: <link rel="manifest" href="/manifest.json" />

## PWA SERVICE WORKER
Create /public/sw.js:
```javascript
const CACHE_NAME = "zuri-v1";
const STATIC_ASSETS = ["/", "/offline", "/Zuri_Logo.png", "/Zuri_Favicon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
  ));
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request).then((r) => r || caches.match("/offline")))
  );
});
```
Register in layout.tsx:
```tsx
<script dangerouslySetInnerHTML={{ __html: `
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
  }
`}} />
```

## HERO SECTION — VIDEO BACKGROUND
Replace HeroWordSwap component entirely.
File: src/components/marketing/hero-word-swap.tsx

Requirements:
- Full viewport height
- Looping compressed video background (/public/hero-video.mp4)
- Gradient overlay: linear-gradient(to bottom, rgba(12,12,14,0.3), rgba(12,12,14,0.7), #0C0C0E)
- Fallback: animated CSS gradient when video fails or is loading
- Video: autoPlay muted loop playsInline preload="auto"
- Animated word-swap headline (keep existing logic, enhance animation)
- Word-swap uses blur+slide: initial {opacity:0, y:14, filter:"blur(8px)"}, animate {opacity:1, y:0, filter:"blur(0px)"}
- TWO CTAs: "Build your presence" (gold filled) + "See how it works" (outline)
- Eyebrow text: "BUILT FOR AFRICA · POWERED BY GEMINI" in gold, letter-spaced
- Subheadline in Montserrat Regular, max-w-2xl, centered
- Scroll indicator at bottom: animated chevron-down icon bouncing
- Canvas particle animation layer BEHIND the video (subtle, 20-30 particles max)

```tsx
// Video background pattern:
<div className="relative min-h-screen overflow-hidden">
  {/* Canvas particles - behind everything */}
  <ZuriParticleCanvas />
  
  {/* Video background */}
  <video
    autoPlay muted loop playsInline preload="auto"
    className="absolute inset-0 h-full w-full object-cover"
    style={{ zIndex: 1 }}
    onError={(e) => (e.currentTarget.style.display = "none")}
  >
    <source src="/hero-video.mp4" type="video/mp4" />
  </video>
  
  {/* Gradient overlay */}
  <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" style={{ zIndex: 2 }} />
  
  {/* Content */}
  <div className="relative z-10 ...">
    {/* headline, CTAs etc */}
  </div>
  
  {/* Scroll indicator */}
  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
    <ChevronDown className="size-6 text-gold/60" />
  </div>
</div>
```

## CANVAS PARTICLE SYSTEM (ZURI FAVICON SPINNING)
Create src/components/ui/zuri-particle-canvas.tsx

This is the signature visual element across ALL dashboard pages and some marketing sections.

```tsx
"use client";
import { useEffect, useRef } from "react";

interface Particle {
  x: number; y: number;
  size: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  vx: number; vy: number;
}

export function ZuriParticleCanvas({ 
  count = 12, 
  opacity = 0.04,
  className 
}: { 
  count?: number; 
  opacity?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Load Zuri favicon as image
    const img = new Image();
    img.src = "/Zuri_Favicon.png";
    
    let animId: number;
    let particles: Particle[] = [];
    
    function resize() {
      canvas!.width = canvas!.offsetWidth;
      canvas!.height = canvas!.offsetHeight;
      initParticles();
    }
    
    function initParticles() {
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas!.width,
        y: Math.random() * canvas!.height,
        size: Math.random() * 60 + 20,
        opacity: Math.random() * opacity,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.003,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
      }));
    }
    
    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      particles.forEach((p) => {
        p.rotation += p.rotationSpeed;
        p.x += p.vx;
        p.y += p.vy;
        
        // Wrap around edges
        if (p.x < -p.size) p.x = canvas!.width + p.size;
        if (p.x > canvas!.width + p.size) p.x = -p.size;
        if (p.y < -p.size) p.y = canvas!.height + p.size;
        if (p.y > canvas!.height + p.size) p.y = -p.size;
        
        ctx!.save();
        ctx!.globalAlpha = p.opacity;
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rotation);
        ctx!.drawImage(img, -p.size / 2, -p.size / 2, p.size, p.size);
        ctx!.restore();
      });
      animId = requestAnimationFrame(draw);
    }
    
    img.onload = () => {
      resize();
      draw();
    };
    
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [count, opacity]);
  
  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full pointer-events-none ${className ?? ""}`}
      style={{ zIndex: 0 }}
    />
  );
}
```

Add ZuriParticleCanvas to these pages (with position: relative on parent):
- src/app/(app)/dashboard/page.tsx — count=8, opacity=0.03
- src/app/(app)/plan/page.tsx — count=6, opacity=0.03
- src/app/(app)/content/page.tsx — count=6, opacity=0.025
- src/app/(app)/website/page.tsx — count=5, opacity=0.025
- src/app/(app)/agencies/page.tsx — count=6, opacity=0.025
- src/app/(marketing)/pricing/page.tsx — count=10, opacity=0.03
- src/app/(auth)/login/page.tsx — count=8, opacity=0.04
- src/app/(auth)/signup/page.tsx — count=8, opacity=0.04

## SKELETON LOADERS
Create src/components/ui/skeleton.tsx:
```tsx
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-surface",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-shimmer before:bg-gradient-to-r",
        "before:from-transparent before:via-white/5 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

// Zuri favicon spinner — replaces ALL generic spinners
export function ZuriSpinner({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <img
        src="/Zuri_Favicon.png"
        alt="Loading..."
        width={size}
        height={size}
        className="animate-spin object-contain"
        style={{ animationDuration: "1.5s", animationTimingFunction: "linear" }}
      />
    </div>
  );
}

// Dashboard stat skeleton
export function StatCardSkeleton() {
  return (
    <div className="zuri-card">
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

// Task card skeleton
export function TaskCardSkeleton() {
  return (
    <div className="zuri-card space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-3 mt-4">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  );
}

// Content slot skeleton
export function ContentSlotSkeleton() {
  return (
    <div className="zuri-card space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

// Agency card skeleton
export function AgencyCardSkeleton() {
  return (
    <div className="zuri-card space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}
```

Replace ALL instances of <Loader2 className="animate-spin" /> with <ZuriSpinner size={24} />
Replace ALL loading states with appropriate skeleton components.

Add loading.tsx files to every app route:
- src/app/(app)/dashboard/loading.tsx
- src/app/(app)/plan/loading.tsx
- src/app/(app)/content/loading.tsx
- src/app/(app)/website/loading.tsx
- src/app/(app)/agencies/loading.tsx

Each loading.tsx:
```tsx
import { ZuriSpinner } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <ZuriSpinner size={48} />
    </div>
  );
}
```

## LANDING PAGE REDESIGN
File: src/app/page.tsx

Complete visual overhaul maintaining the same sections but dramatically elevating quality:

NAVIGATION:
- Frosted glass: bg-background/60 backdrop-blur-xl
- Left: Logo (full wordmark, size="md")
- Center: Nav links in Montserrat, gap-10, with animated underline on hover
- Right: "Sign in" ghost + "Build your presence" gold button
- On scroll: add border-b border-white/5 transition
- Mobile: hamburger menu with slide-from-left drawer

STATS STRIP (after hero):
- Background: bg-surface/80 backdrop-blur-sm
- Three stats with animated count-up on scroll using Framer Motion
- Gold large numbers, Montserrat body text
- Subtle dividers between stats on desktop

HOW IT WORKS:
- Alternating layout (step left + visual right, then flip)
- Each step has a large gold number behind the card (decorative, low opacity)
- Cards: glassmorphism — bg-white/[0.02] backdrop-blur border border-white/5
- Hover: border-gold/20 transition

FOUR PILLARS:
- True bento grid (not equal columns)
- Website Generator spans 2 columns, has animated mockup inside the card
- Each card: hover lifts with box-shadow: 0 20px 40px rgba(0,0,0,0.4)
- Icon in gold circle, not emoji

SOCIAL PROOF:
- Auto-scrolling marquee of business types (infinite scroll animation)
- CSS: @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }

FINAL CTA SECTION:
- Video background (same hero video, different overlay angle)
- Or: animated gradient mesh background
- Large Cormorant Garamond headline
- Gold button with glow effect on hover: box-shadow: 0 0 30px rgba(201,168,76,0.4)

FOOTER:
- Three columns: Logo + tagline | Navigation links | Social/contact
- Bottom bar: copyright + "Built for Africa. Powered by Gemini."
- Subtle top border: border-white/5

## GLOBAL CSS ADDITIONS
Add to src/app/globals.css:

```css
/* Glassmorphism card variant */
.glass-card {
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 1rem;
}

/* Gold glow button effect */
.btn-gold-glow:hover {
  box-shadow: 0 0 30px rgba(201, 168, 76, 0.35), 0 0 60px rgba(201, 168, 76, 0.15);
  transform: translateY(-1px);
  transition: all 0.3s ease;
}

/* Premium text gradient */
.text-gradient-gold {
  background: linear-gradient(135deg, #C9A84C 0%, #E2BC5A 50%, #C9A84C 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Animated gradient mesh background */
.gradient-mesh {
  background: 
    radial-gradient(ellipse at 20% 50%, rgba(201,168,76,0.07) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(201,168,76,0.05) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 80%, rgba(201,168,76,0.04) 0%, transparent 50%),
    #0C0C0E;
  animation: meshShift 15s ease-in-out infinite alternate;
}

@keyframes meshShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Marquee animation for social proof */
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.animate-marquee {
  animation: marquee 25s linear infinite;
}

/* Page transition */
.page-enter {
  animation: pageIn 0.4s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
}
@keyframes pageIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Premium scrollbar (already exists, enhance) */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { 
  background: rgba(201, 168, 76, 0.2); 
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover { background: rgba(201, 168, 76, 0.4); }

/* Button base improvements */
button, a {
  transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
}

/* Focus ring in gold */
*:focus-visible {
  outline: 2px solid #C9A84C;
  outline-offset: 2px;
}
```

## DASHBOARD PAGES — VISUAL ELEVATION

DASHBOARD HOME (src/app/(app)/dashboard/page.tsx):
- Wrap entire page in <div className="relative min-h-screen">
- Add <ZuriParticleCanvas count={8} opacity={0.03} /> as first child
- Greeting: font-heading text-5xl, with current day/time
- Streak display: large flame icon (Lucide), gold number, animated pulse
- Today's Task card: glassmorphism style (.glass-card), gold left border accent (border-l-4 border-gold)
- Stat cards: glass effect, hover scale-[1.02] transition
- Week progress: custom styled progress bar (not default), gradient gold fill
- Add "Quick Actions" row: 3 buttons — "Generate content", "Edit website", "View plan"

SIDEBAR (src/components/app/sidebar.tsx):
- Width: 240px expanded
- Logo at top with proper sizing
- Active state: gold left border + bg-gold/10 + text-gold
- Inactive hover: bg-white/[0.03]
- Bottom section: user avatar + name + plan badge + settings link
- Very subtle gradient: from-background to-surface/50

AUTH PAGES (login + signup):
- Full screen split layout on desktop: left side = ZuriParticleCanvas with logo centered + tagline, right side = form
- Mobile: full screen form with subtle particle canvas
- Form card: glass-card style
- Add "Join 10,000+ African entrepreneurs" social proof line beneath form
- Signup: add video background option in the right panel

ONBOARDING:
- Progress indicator at top: numbered steps with connecting line
- Each screen: smooth Framer Motion slide transition (not just fade)
- Voice path: animated waveform visualization during recording
- Build screen (screen 5): each step has animated Zuri favicon spinner

## COMPONENT-LEVEL IMPROVEMENTS

BUTTON COMPONENT:
- Default (gold): add subtle shimmer animation on hover
- Add new "premium" variant: gold gradient border, transparent bg, gold text
- All buttons: rounded-xl (not rounded-lg), h-12 (slightly taller)
- Transition: duration-200

CARD COMPONENT:
- Add hover variant: hover:border-white/10 hover:shadow-2xl
- Premium variant: glass-card style
- Add subtle inner glow on hover: box-shadow: inset 0 1px 0 rgba(255,255,255,0.05)

INPUT COMPONENT:
- Height: h-12
- Border: border-white/10 (softer than current)
- Focus: border-gold/50 with gold glow: box-shadow: 0 0 0 3px rgba(201,168,76,0.1)
- Background: bg-white/[0.02]
- Placeholder: text-white/30

TOPBAR:
- Glassmorphism: bg-background/80 backdrop-blur-xl
- Add notification bell with red dot indicator
- User avatar: show actual avatar if available, fallback to initial with gradient bg
- Add current plan badge next to avatar

## MARKETING PAGES ELEVATION

FEATURES PAGE (bento grid):
- Cards use glass-card style
- Each card has animated icon that plays on hover (scale + color shift)
- Website Generator card: embed a mini animated mockup (CSS-only fake browser chrome)
- Add "See it in action" CTA beneath grid

PRICING PAGE:
- Add gradient mesh background
- Popular plan card: gold gradient border + subtle gold glow
- Add annual/monthly toggle with smooth animation
- Add "Early adopter" banner above cards with countdown or spots remaining
- FAQ: styled accordion with animated chevron

HOW IT WORKS:
- Add progress line connecting the three steps (animated on scroll)
- Each step: hover reveals more detail (expandable)
- Add real screenshot placeholders (styled mockup frames)

AGENCY PARTNERS:
- Agency cards: logo placeholder with gradient, hover reveals contact
- Add "Response time" indicator with green dot
- Map or location tags with MapPin icon

## MOBILE RESPONSIVENESS AUDIT
Review and fix every page for:
- Touch targets minimum 44x44px
- No horizontal scroll
- Bottom nav safe area padding (env(safe-area-inset-bottom))
- Font sizes: minimum 14px body, 16px inputs (prevents iOS zoom)
- Images: proper srcSet for mobile
- Video: hide on low-bandwidth (prefers-reduced-data media query)

## ANIMATION PRINCIPLES
All animations must follow these rules:
1. Duration: 200-400ms for UI, 600-900ms for page reveals
2. Easing: cubic-bezier(0.25, 0.1, 0.25, 1) for most, spring for interactive
3. Reduced motion: wrap all Framer Motion in useReducedMotion() check
4. Stagger: 80ms between list items
5. Never animate opacity AND transform simultaneously on mobile (performance)

Add this hook: src/hooks/use-reduced-motion.ts
```tsx
"use client";
import { useEffect, useState } from "react";
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    mq.addEventListener("change", (e) => setReduced(e.matches));
  }, []);
  return reduced;
}
```

## PERFORMANCE REQUIREMENTS
- All images: use Next.js <Image> with priority on hero images
- Video: preload="auto", provide poster image
- Canvas: requestAnimationFrame, cleanup on unmount
- Fonts: display="swap" on all Google Fonts
- Code splitting: dynamic imports for heavy components (BlockRenderer, canvas)
- Lighthouse target: Performance >85, Accessibility >95

## SESSION RULES FOR CLAUDE CODE
1. ONE section per session maximum
2. Always run the dev server and verify no TypeScript errors before moving on
3. Commit to GitHub after each working section
4. Never break existing functionality while improving UI
5. Test on mobile viewport (375px) after every change
6. If a component needs to be rewritten from scratch, do it — don't patch
7. Priority order: 1) Logo/Favicon 2) Typography 3) Skeleton/Spinners 4) Canvas 5) Hero 6) Dashboard 7) Auth pages 8) Marketing pages 9) Component polish 10) PWA

## RECOMMENDED SESSION BREAKDOWN
Session 1: Logo + Favicon + Typography (Montserrat) + Global CSS additions
Session 2: ZuriParticleCanvas + ZuriSpinner + Skeleton components + loading.tsx files
Session 3: Hero section redesign (video + particles + enhanced word-swap)
Session 4: Dashboard home + Sidebar elevation
Session 5: Auth pages (split layout + particles)
Session 6: Onboarding redesign
Session 7: Landing page remaining sections (stats, pillars, CTA)
Session 8: Marketing sub-pages (features, pricing, how-it-works)
Session 9: Component polish (button, card, input, topbar)
Session 10: Mobile audit + PWA finalization + Performance pass