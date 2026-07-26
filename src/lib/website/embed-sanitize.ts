import { sanitizeText } from "@/lib/utils/sanitize";
import type { EmbedProvider, ResolvedEmbed } from "@/types/website";
import { escapeAttr } from "@/lib/website/link-sanitize";

export const MAX_EMBEDS = 3;

/** Hostnames allowed as iframe src (explicit — no wildcards). */
export const EMBED_HOST_ALLOWLIST = new Set([
  "www.youtube.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  "www.google.com",
  "maps.google.com",
  "calendly.com",
  "www.calendly.com",
  "docs.google.com",
  "forms.gle",
  "www.eventbrite.com",
  "eventbrite.com",
]);

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h.startsWith("192.168.") ||
    h.startsWith("10.") ||
    h.startsWith("172.16.") ||
    h.endsWith(".local")
  );
}

function parseHttpUrl(input: string): URL | null {
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (isPrivateHost(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

function youtubeEmbedSrc(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;

  let id = "";
  if (host === "youtu.be" || host === "www.youtu.be") {
    id = url.pathname.replace(/^\//, "").split("/")[0] ?? "";
  } else if (url.pathname.startsWith("/embed/")) {
    id = url.pathname.slice("/embed/".length).split("/")[0] ?? "";
  } else if (url.pathname.startsWith("/shorts/")) {
    id = url.pathname.slice("/shorts/".length).split("/")[0] ?? "";
  } else {
    id = url.searchParams.get("v") ?? "";
  }

  if (!/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return null;
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

function vimeoEmbedSrc(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (!VIMEO_HOSTS.has(host)) return null;

  let id = "";
  if (host === "player.vimeo.com") {
    const m = url.pathname.match(/^\/video\/(\d+)/);
    id = m?.[1] ?? "";
  } else {
    const m = url.pathname.match(/^\/(?:video\/)?(\d+)/);
    id = m?.[1] ?? "";
  }

  if (!/^\d{6,12}$/.test(id)) return null;
  return `https://player.vimeo.com/video/${id}`;
}

function googleMapsEmbedSrc(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (host !== "www.google.com" && host !== "maps.google.com" && host !== "google.com") {
    return null;
  }

  // Already an embed URL
  if (url.pathname.includes("/maps/embed")) {
    return `https://www.google.com${url.pathname}${url.search}`;
  }

  // Place / search / @coords → embed via q=
  if (url.pathname.includes("/maps")) {
    const q =
      url.searchParams.get("q") ||
      url.searchParams.get("query") ||
      (() => {
        const place = url.pathname.match(/\/maps\/place\/([^/]+)/);
        if (place?.[1]) return decodeURIComponent(place[1].replace(/\+/g, " "));
        const at = url.pathname.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (at) return `${at[1]},${at[2]}`;
        return null;
      })();

    if (!q) return null;
    const params = new URLSearchParams({ q, output: "embed" });
    return `https://maps.google.com/maps?${params.toString()}`;
  }

  return null;
}

function hostAllowed(hostname: string): boolean {
  return EMBED_HOST_ALLOWLIST.has(hostname.toLowerCase());
}

function googleMapsPathOk(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (host === "www.google.com" || host === "maps.google.com") {
    return (
      url.pathname.includes("/maps/embed") ||
      url.pathname.startsWith("/maps") ||
      url.searchParams.get("output") === "embed"
    );
  }
  if (host === "docs.google.com") {
    return url.pathname.includes("/forms/") || url.pathname.includes("/document/");
  }
  return true;
}

/**
 * Normalize a share URL or embed URL into a final iframe src + provider.
 */
export function parseEmbedUrl(
  input: string
): { src: string; provider: EmbedProvider } | null {
  const url = parseHttpUrl(input);
  if (!url) return null;

  const yt = youtubeEmbedSrc(url);
  if (yt) return { src: yt, provider: "youtube" };

  const vim = vimeoEmbedSrc(url);
  if (vim) return { src: vim, provider: "vimeo" };

  const maps = googleMapsEmbedSrc(url);
  if (maps) return { src: maps, provider: "google_maps" };

  // Generic allowlisted iframe src (Calendly, Forms, Eventbrite, …)
  if (hostAllowed(url.hostname) && googleMapsPathOk(url)) {
    url.protocol = "https:";
    return { src: url.toString(), provider: "iframe" };
  }

  return null;
}

/**
 * Extract a single iframe src from pasted embed HTML.
 * Rejects scripts and non-iframe markup; only allowlisted hosts.
 */
export function parseEmbedHtml(
  input: string
): { src: string; provider: EmbedProvider; title?: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Strip scripts entirely before any further parsing
  if (/<script[\s>]/i.test(trimmed)) return null;

  // Prefer a bare URL if no HTML tags
  if (!/<iframe[\s>]/i.test(trimmed) && !/</.test(trimmed)) {
    return parseEmbedUrl(trimmed);
  }

  const iframeMatch = trimmed.match(/<iframe\b[^>]*>/i);
  if (!iframeMatch) return null;

  const tag = iframeMatch[0];
  const srcMatch = tag.match(/\bsrc\s*=\s*(["'])([^"']+)\1/i);
  if (!srcMatch?.[2]) return null;

  const titleMatch = tag.match(/\btitle\s*=\s*(["'])([^"']*)\1/i);
  const title = titleMatch?.[2]?.trim()
    ? sanitizeText(titleMatch[2]).slice(0, 120)
    : undefined;

  const parsed = parseEmbedUrl(srcMatch[2]);
  if (!parsed) return null;

  // If user pasted a YouTube/Vimeo/Maps iframe, keep those providers;
  // otherwise treat as generic iframe.
  return { ...parsed, title };
}

export function parseEmbedInput(
  input: string
): { src: string; provider: EmbedProvider; title?: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/<iframe[\s>]/i.test(trimmed) || /<script[\s>]/i.test(trimmed)) {
    return parseEmbedHtml(trimmed);
  }
  return parseEmbedUrl(trimmed);
}

export function renderSafeIframe(
  src: string,
  options?: { title?: string; provider?: EmbedProvider }
): string {
  const title = escapeAttr(options?.title || "Embedded content");
  const safeSrc = escapeAttr(src);
  const isVideo =
    options?.provider === "youtube" || options?.provider === "vimeo";
  const allow = isVideo
    ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    : "fullscreen";
  const allowfullscreen = isVideo ? " allowfullscreen" : "";

  return `<iframe src="${safeSrc}" title="${title}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="${allow}"${allowfullscreen} style="position:absolute;inset:0;width:100%;height:100%;border:0;"></iframe>`;
}

export function normalizeFilledEmbeds(raw: unknown): ResolvedEmbed[] {
  if (!Array.isArray(raw)) return [];
  const out: ResolvedEmbed[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const v = item as Record<string, unknown>;
    const id = typeof v.id === "string" ? v.id.trim().slice(0, 64) : "";
    const src = typeof v.src === "string" ? v.src.trim() : "";
    const provider = v.provider;
    if (!id || !src) continue;
    if (
      provider !== "youtube" &&
      provider !== "vimeo" &&
      provider !== "google_maps" &&
      provider !== "iframe"
    ) {
      continue;
    }
    // Re-validate src against allowlist / known providers
    const checked = parseEmbedUrl(src);
    if (!checked) continue;

    const title =
      typeof v.title === "string" && v.title.trim()
        ? sanitizeText(v.title).slice(0, 120)
        : undefined;

    out.push({
      id,
      provider: checked.provider,
      src: checked.src,
      ...(title ? { title } : {}),
    });
    if (out.length >= MAX_EMBEDS) break;
  }
  return out;
}

export function buildEmbedSectionHtml(embeds: ResolvedEmbed[]): string {
  if (embeds.length === 0) return "";

  const items = embeds
    .map((embed) => {
      const iframe = renderSafeIframe(embed.src, {
        title: embed.title,
        provider: embed.provider,
      });
      return `<div class="zuri-embed-item" data-embed-id="${escapeAttr(embed.id)}" style="position:relative;width:100%;padding-bottom:56.25%;margin:0 0 1.5rem;overflow:hidden;border-radius:4px;background:rgba(0,0,0,.04);">${iframe}</div>`;
    })
    .join("\n");

  return `<section id="zuri-embeds" data-embed-root aria-label="Embedded content" style="padding:3rem 1.25rem;max-width:960px;margin:0 auto;">
${items}
</section>`;
}
