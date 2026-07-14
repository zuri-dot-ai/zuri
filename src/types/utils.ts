import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className merge (shadcn standard) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as Nigerian Naira (primary currency) */
export function formatNGN(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format USD (secondary currency, shown small + grey) */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Slugify a business name (mirror of DB generate_unique_slug base) */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "site";
}

/** Safely parse a JSON string returned from Gemini (strips markdown fences) */
export function parseGeminiJSON<T>(raw: string): T {
  let cleaned = raw.trim();
  // Strip ```json ... ``` or ``` ... ``` fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  // Grab the first { ... } or [ ... ] block if extra prose leaks in
  const match = cleaned.match(/[[{][\s\S]*[\]}]/);
  if (match) cleaned = match[0];
  return JSON.parse(cleaned) as T;
}

/** Relative "x days ago" style label */
export function timeAgo(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** Clamp helper */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}