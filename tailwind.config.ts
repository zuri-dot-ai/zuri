import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        // ── ZURI CORE BRAND (System A — docs/13 §1) ─────
        background: "hsl(var(--background))",     // #0e0e10
        surface: "hsl(var(--surface))",           // #1a1a1d
        foreground: "hsl(var(--foreground))",     // #f2f2f3
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))", // #a7a8ad text-mid
        },
        border: "hsl(var(--border))",             // #2b2b2f
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // ── WARM GOLD ACCENT (marketing-site match) ─────
        gold: {
          DEFAULT: "#d4a656",
          hover: "#f0c878",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",         // #d4a656
          foreground: "hsl(var(--primary-foreground))",
        },

        // ── STATUS ──────────────────────────────────────
        success: "#3D9970",
        error: "#C0392B",
        destructive: {
          DEFAULT: "#C0392B",
          foreground: "#F0EEE9",
        },

        // ── shadcn aliases ──────────────────────────────
        card: {
          DEFAULT: "hsl(var(--surface))",
          foreground: "hsl(var(--foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--surface))",
          foreground: "hsl(var(--foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--foreground))",
        },
      },

      fontFamily: {
        // Headings — elegant, premium
        heading: ["var(--font-cormorant)", "Georgia", "serif"],
        // Body / UI — clean, modern
        sans: ["var(--font-montserrat)", "system-ui", "sans-serif"],
        // Data / code
        mono: ["var(--font-jetbrains)", "monospace"],
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      // ── MOTION STYLE TOKENS (Website Generator) ────────
      transitionTimingFunction: {
        "slow-elegant": "cubic-bezier(0.25, 0.1, 0.25, 1)",
        "crisp-modern": "cubic-bezier(0.4, 0, 0.2, 1)",
        "bold-energetic": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        "slow-elegant": "800ms",
        "crisp-modern": "400ms",
        "bold-energetic": "300ms",
      },

      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "word-swap": {
          "0%, 20%": { opacity: "0", transform: "translateY(8px)" },
          "30%, 70%": { opacity: "1", transform: "translateY(0)" },
          "80%, 100%": { opacity: "0", transform: "translateY(-8px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.6s cubic-bezier(0.25, 0.1, 0.25, 1) forwards",
        "word-swap": "word-swap 3s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;