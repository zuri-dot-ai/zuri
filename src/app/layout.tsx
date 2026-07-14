import type { Metadata } from "next";
import { Toaster } from "sonner";
import { BRAND } from "@/lib/constants";
import "./globals.css";

// Import the exact weights from @fontsource
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";

import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";

import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/jetbrains-mono/800.css";

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description:
    "Zuri takes African business owners from zero online presence to a live premium website, a 90-day content plan, and vetted execution partners — all from a single conversation. Powered by Gemini.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  openGraph: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description:
      "Your business, online. Beautifully. Built for Africa. Powered by Gemini.",
    type: "website",
    locale: "en_NG",
  },
  icons: {
    icon: "/Zuri_Favicon.png",
    apple: "/Zuri_Favicon.png",
    shortcut: "/Zuri_Favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Define CSS variables for the font families */}
        <style>{`
          :root {
            --font-montserrat: 'Montserrat', sans-serif;
            --font-cormorant: 'Cormorant Garamond', serif;
            --font-jetbrains: 'JetBrains Mono', monospace;
          }
        `}</style>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`min-h-screen bg-background font-sans text-foreground antialiased`}
        style={{
          fontFamily: "var(--font-montserrat)",
        }}
      >
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: BRAND.colors.surface,
              border: `1px solid ${BRAND.colors.border}`,
              color: BRAND.colors.foreground,
            },
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .catch(function(err) { console.log('SW registration failed:', err); });
    });
  }
`,
          }}
        />
      </body>
    </html>
  );
}