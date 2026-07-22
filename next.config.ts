import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/** Non-CSP headers — safe for user-site HTML (/preview, /sites). */
const baseSecurityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
];

/** Full CSP — dashboard / app chrome only (not user websites). */
const appSecurityHeaders = [
  ...baseSecurityHeaders,
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.flutterwave.com https://api.flutterwave.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://images.unsplash.com https://images.pexels.com https://*.supabase.co https://*.supabase.in https://generativelanguage.googleapis.com https://lh3.googleusercontent.com",
      "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.flutterwave.com https://checkout.flutterwave.com https://api.unsplash.com https://api.pexels.com https://generativelanguage.googleapis.com https://api.resend.com https://graph.facebook.com https://searchconsole.googleapis.com https://api.vercel.com",
      "frame-src 'self' https://checkout.flutterwave.com https://www.facebook.com",
      "media-src 'self' blob: https://*.supabase.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

/**
 * CSP for rendered user-site HTML (`/preview`, `/sites`). Tighter than the
 * app CSP (no Flutterwave/Resend/etc — sites don't call those), but still
 * needs to allow whatever origins template_html actually renders: Google
 * Fonts (link tags in every template), Supabase (image storage + any
 * client-side data fetches from injected scripts), and the stock image
 * providers used for fallback/slot images. Explicitly enumerated — never `*`.
 */
const previewSecurityHeaders = [
  ...baseSecurityHeaders,
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://images.unsplash.com https://images.pexels.com https://*.supabase.co https://*.supabase.in",
      "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com https://api.unsplash.com https://api.pexels.com",
      "media-src 'self' blob: https://*.supabase.co",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "source.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "videos.pexels.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },

  async headers() {
    return [
      {
        // User-site HTML — own (tighter) CSP, not the app CSP, since sites
        // don't need Flutterwave/Resend/etc and shouldn't be able to reach them.
        source: "/preview/:path*",
        headers: previewSecurityHeaders,
      },
      {
        source: "/sites/:path*",
        headers: previewSecurityHeaders,
      },
      {
        // App chrome — exclude preview/sites so CSP is not merged onto them
        source: "/((?!preview(?:/|$)|sites(?:/|$)).*)",
        headers: appSecurityHeaders,
      },
      {
        source: "/api/analytics/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
      {
        source: "/api/contact-form",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
};

// Only wrap with the Sentry build plugin (source map upload, etc.) when a
// DSN is actually configured — keeps local dev / competition builds free of
// any Sentry auth requirement when no account is set up yet.
export default process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      disableLogger: true,
      widenClientFileUpload: false,
    })
  : nextConfig;
