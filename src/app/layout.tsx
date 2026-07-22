import type { Metadata } from "next";
import { Montserrat, Cormorant_Garamond } from "next/font/google";
import { Toaster } from "sonner";
import { BRAND } from "@/lib/constants";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import "@/styles/dashboard.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

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
    images: [{ url: "/zuri_meta.jpeg", width: 1584, height: 792 }],
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${montserrat.variable} ${cormorant.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ThemeProvider>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "hsl(var(--surface))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
                borderRadius: 12,
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
