"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/monitoring/sentry";

/**
 * Catches errors thrown in the root layout itself (above `src/app/error.tsx`'s
 * reach). Must render its own <html>/<body> — the root layout is not
 * available here. Kept framework-plain (no design system imports) so it can
 * never itself fail to render.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { context: "global-error", route: "root-layout" });
  }, [error]);

  return (
    <html>
      <body
        style={{
          backgroundColor: "#0C0C0E",
          color: "#F0EDE8",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
          Zuri is temporarily unavailable
        </h1>
        <p style={{ opacity: 0.5, marginBottom: "2rem", maxWidth: 420 }}>
          We&apos;re experiencing technical difficulties. Please try again in
          a moment.
        </p>
        <button
          onClick={reset}
          style={{
            background: "#C9A84C",
            color: "#0C0C0E",
            padding: "12px 32px",
            borderRadius: "8px",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
