import type { NextConfig } from "next";

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
        // User-site HTML — no app CSP (sites load their own image CDNs)
        source: "/preview/:path*",
        headers: baseSecurityHeaders,
      },
      {
        source: "/sites/:path*",
        headers: baseSecurityHeaders,
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

export default nextConfig;
