import type { Metadata } from "next";
import { Toaster } from "sonner";
import { BRAND } from "@/lib/constants";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

import "@fontsource/montserrat/300.css";
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
    "Launch your business online with Zuri. Instantly create a premium website, unlock a personalized 90-day content plan, and accelerate growth with AI.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  openGraph: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    type: "website",
    locale: "en_NG",
    images: [{ url: "/zuri_meta.png", width: 1584, height: 792 }],
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },
};

const themeBootScript = `
(function(){
  try {
    var t = localStorage.getItem('zuri-theme');
    if (t !== 'light' && t !== 'dark') t = 'dark';
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.classList.add(t === 'light' ? 'light' : 'dark');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
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
        className="min-h-screen bg-background font-sans text-foreground antialiased"
        style={{ fontFamily: "var(--font-montserrat)" }}
      >
        <ThemeProvider>
          {children}
          <Toaster
            theme="system"
            position="top-center"
            toastOptions={{
              style: {
                background: "hsl(var(--surface))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
                borderRadius: 0,
              },
            }}
          />
        </ThemeProvider>
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
