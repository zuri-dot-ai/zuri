// src/hooks/use-is-mobile.ts
"use client";

import { useEffect, useState } from "react";

/** Matches Tailwind's default `lg` breakpoint (1024px) — below this, the
 *  studio editor collapses to a stacked single-column mobile layout. */
const QUERY = "(max-width: 1023px)";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    setIsMobile(mql.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
