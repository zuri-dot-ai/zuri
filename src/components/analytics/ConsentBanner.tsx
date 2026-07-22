"use client";

/**
 * On-brand consent banner (Session 4A v2 — docs/05_ANALYTICS.md addendum).
 *
 * This is the reference implementation for the consent prompt shown on
 * published Zuri sites. Published sites are served as raw HTML strings (see
 * src/lib/website/serve-html.ts), not a hydrated React tree, so the actual
 * runtime artifact injected there is the inline HTML/JS template produced by
 * getConsentBannerScript() in src/lib/analytics/tracking-script.ts — kept in
 * lockstep with this component's copy/behavior. This component exists so the
 * banner's markup/behavior lives in one reviewable, on-brand source, and can
 * be reused directly in any React-rendered surface (e.g. dashboard preview).
 *
 * Style: minimal bottom bar, Vercel/Linear-style — not a compliance-popup
 * aesthetic (no modal, no overlay, no legal wall of text).
 */

import { useEffect, useState } from "react";
import { hasRecordedChoice, recordConsent } from "@/lib/analytics/consent";

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!hasRecordedChoice());
  }, []);

  if (!visible) return null;

  function choose(choice: "accepted" | "declined") {
    recordConsent(choice);
    setVisible(false);
  }

  return (
    <div
      role="banner"
      aria-label="Cookie-free analytics consent"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 2147483647,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        padding: "0.75rem 1.25rem",
        background: "#111",
        color: "#f5f5f5",
        font: "500 13px/1.5 system-ui, -apple-system, sans-serif",
        boxShadow: "0 -1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <span style={{ color: "rgba(245,245,245,0.85)" }}>
        We use cookie-free analytics to understand site traffic. No personal
        data is sold or shared.
      </span>
      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => choose("declined")}
          style={{
            background: "transparent",
            color: "rgba(245,245,245,0.7)",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: "2px",
            padding: "0.4rem 0.85rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => choose("accepted")}
          style={{
            background: "#e8c547",
            color: "#111",
            border: "none",
            borderRadius: "2px",
            padding: "0.4rem 0.85rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
