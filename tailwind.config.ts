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
        background: "hsl(var(--background))",
        surface: "hsl(var(--surface))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        gold: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },

        success: "#3D9970",
        error: "#C0392B",
        destructive: {
          DEFAULT: "#C0392B",
          foreground: "#F0EEE9",
        },

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
          DEFAULT: "var(--bg-elevated)",
          foreground: "hsl(var(--foreground))",
        },
      },

      fontFamily: {
        heading: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-inter)", "system-ui", "sans-serif"],
      },

      fontSize: {
        display: ["2.25rem", { lineHeight: "1.15", fontWeight: "700", letterSpacing: "-0.02em" }],
        h1: ["1.5rem", { lineHeight: "1.25", fontWeight: "600", letterSpacing: "-0.02em" }],
        h2: ["1.125rem", { lineHeight: "1.35", fontWeight: "600", letterSpacing: "-0.015em" }],
        body: ["0.9375rem", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["0.8125rem", { lineHeight: "1.4", fontWeight: "400" }],
      },

      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },

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
