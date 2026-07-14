import type { NextConfig } from "next";

const securityHeaders = [
  // HSTS — force HTTPS for 2 years, include subdomains
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Prevent MIME type sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Control referrer information
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Disable browser features we don't use
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  // DNS prefetch for performance
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Scripts: self + Flutterwave payment SDK
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.flutterwave.com https://api.flutterwave.com",
      // Note: 'unsafe-inline' required for Next.js inline scripts; 'unsafe-eval' for Next.js dev
      // In production, replace with nonces when Next.js supports it fully

      // Styles: self + Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

      // Fonts: self + Google Fonts CDN
      "font-src 'self' https://fonts.gstatic.com",

      // Images: self + data URIs + stock photo CDNs + Supabase storage + Google AI (Imagen)
      "img-src 'self' data: blob: https://images.unsplash.com https://images.pexels.com https://*.supabase.co https://*.supabase.in https://generativelanguage.googleapis.com",

      // Connections: self + all external APIs
      "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.flutterwave.com https://checkout.flutterwave.com https://api.unsplash.com https://api.pexels.com https://generativelanguage.googleapis.com https://api.resend.com https://graph.facebook.com https://searchconsole.googleapis.com https://api.vercel.com",

      // Frames: Flutterwave checkout + Meta OAuth
      "frame-src https://checkout.flutterwave.com https://www.facebook.com",

      // Media: self + blob
      "media-src 'self' blob: https://*.supabase.co",

      // Objects: none
      "object-src 'none'",

      // Base URI: self only
      "base-uri 'self'",

      // Form actions: self only
      "form-action 'self'",

      // Upgrade insecure requests
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      // Unsplash stock photography
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "source.unsplash.com" },
      // Pexels stock media
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "videos.pexels.com" },
      // Supabase storage (logos, user uploads, generated videos)
      { protocol: "https", hostname: "*.supabase.co" },
      // Google avatars (OAuth)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },

  // Allow server actions and larger AI payloads
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },

  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Analytics tracking endpoint — allow cross-origin POST from user websites
        source: "/api/analytics/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
      {
        // Contact form endpoint — allow cross-origin POST from user websites
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
