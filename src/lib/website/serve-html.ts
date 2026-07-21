/**
 * Shared helpers for serving stored template_html (docs/02_WEBSITE_BUILDER.md §7.3–7.4).
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { getTrackingScript } from "@/lib/analytics/tracking-script";
import {
  getArchetypeFallback,
  isBrokenImageUrl,
} from "@/lib/website/image-url";
import type { DesignArchetype, WebsiteStatus } from "@/types/website";

/** Session 2B generation previews — local serve smoke only (never in production). */
const DEV_FIXTURE_HANDLES: Record<string, string> = {
  "jollof-house-lagos": "jollof-house-lagos.html",
  nairaflow: "nairaflow.html",
  "aura-spa-ikoyi": "aura-spa-ikoyi.html",
};

/**
 * Dev-only: serve filled HTML from tmp/generation-previews when the DB
 * does not yet have websites.template_html (v2 migration pending).
 */
export function loadDevFixtureHtml(handle: string): string | null {
  if (process.env.NODE_ENV === "production") return null;
  if (process.env.ZURI_SERVE_LOCAL_FIXTURES === "0") return null;

  const file = DEV_FIXTURE_HANDLES[handle];
  if (!file) return null;

  const path = join(process.cwd(), "tmp", "generation-previews", file);
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

export const SUSPENDED_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Website unavailable</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 2rem;
      font-family: Georgia, "Times New Roman", serif;
      background: #f7f4ef;
      color: #1a1a1a;
    }
    main { max-width: 28rem; text-align: center; }
    h1 { font-size: 1.5rem; font-weight: 600; margin: 0 0 0.75rem; }
    p { margin: 0; line-height: 1.5; color: #4a4a4a; }
  </style>
</head>
<body>
  <main>
    <h1>This website is temporarily unavailable</h1>
    <p>The owner needs to renew their plan.</p>
  </main>
</body>
</html>`;

const HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
} as const;

export function htmlResponse(html: string, status = 200): Response {
  return new Response(html, { status, headers: HTML_HEADERS });
}

export function notFoundResponse(): Response {
  return new Response("Not found", { status: 404 });
}

/**
 * Rewrite broken / picsum / missing-fallback img srcs on data-image-slot
 * elements to a reachable Unsplash archetype fallback before serving.
 */
export function sanitizeServedImages(
  html: string,
  archetype: DesignArchetype | string | null | undefined = "clean-modern"
): string {
  const arch = (archetype as DesignArchetype) || "clean-modern";
  const fallback = getArchetypeFallback(arch).url;
  let out = html;

  const slotRegex = /<img\b[^>]*\bdata-image-slot="[^"]+"[^>]*>/gi;
  const matches = [...html.matchAll(slotRegex)];

  for (const match of matches) {
    const tag = match[0];
    const srcMatch = tag.match(/\bsrc="([^"]*)"/i);
    const src = srcMatch?.[1] ?? "";
    if (!isBrokenImageUrl(src)) continue;

    const fixed = tag.includes("src=")
      ? tag.replace(/\bsrc="[^"]*"/i, `src="${fallback}"`)
      : tag.replace(/<img\b/i, `<img src="${fallback}"`);
    out = out.replace(tag, fixed);
  }

  return out;
}

/**
 * Inject a fixed preview banner immediately after the opening <body> tag.
 * Server-side string injection — not a React component.
 */
export function injectPreviewBanner(
  html: string,
  status: WebsiteStatus | string
): string {
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
  const publishHref = `${appUrl}/website`;
  const safeStatus = escapeHtml(String(status || "preview"));

  const banner = `<div id="zuri-preview-banner" role="banner" style="position:fixed;top:0;left:0;right:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;gap:1rem;padding:0.65rem 1rem;background:#111;color:#f5f5f5;font:500 13px/1.4 system-ui,-apple-system,sans-serif;box-shadow:0 1px 0 rgba(255,255,255,0.08)">
  <span>Preview · <strong style="font-weight:600;text-transform:capitalize">${safeStatus}</strong></span>
  <a href="${publishHref}" style="color:#111;background:#e8c547;text-decoration:none;padding:0.35rem 0.75rem;font-weight:600;border-radius:2px">Publish</a>
</div><style>
  body{padding-top:44px !important}
  header#site-nav, header.site-nav, #main-nav, #site-nav, .site-nav { top: 44px !important; }
</style>`;

  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body([^>]*)>/i, `<body$1>${banner}`);
  }
  return banner + html;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeJsString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r|\n/g, " ");
}

/**
 * Wire #contact-form to POST https://app.buildzuri.com/api/contact-form.
 * Templates currently only show a static "Message sent" state (TEMPLATE_PROMPTS
 * rule 10) and lack hidden business_handle / owner_email fields — inject both
 * at serve time so published sites match §10.
 */
export function injectContactFormEndpoint(
  html: string,
  opts: { handle: string; ownerEmail: string }
): string {
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://app.buildzuri.com"
  ).replace(/\/$/, "");
  const endpoint = `${appUrl}/api/contact-form`;
  const handle = escapeJsString(opts.handle);
  const ownerEmail = escapeJsString(opts.ownerEmail);

  const script = `<script data-zuri-contact-wire="1">
(function(){
  var form = document.getElementById('contact-form');
  if (!form || form.getAttribute('data-zuri-wired') === '1') return;
  form.setAttribute('data-zuri-wired', '1');
  function ensureHidden(name, value) {
    var el = form.querySelector('[name=\"' + name + '\"]');
    if (!el) {
      el = document.createElement('input');
      el.type = 'hidden';
      el.name = name;
      form.appendChild(el);
    }
    el.value = value;
  }
  ensureHidden('business_handle', '${handle}');
  ensureHidden('owner_email', '${ownerEmail}');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var fd = new FormData(form);
    var payload = {};
    fd.forEach(function(v, k){ payload[k] = String(v); });
    form.style.display = 'none';
    var conf = document.getElementById('form-confirmation')
      || document.getElementById('form-success');
    if (conf) {
      conf.style.display = 'block';
      conf.classList && conf.classList.add('active');
    }
    fetch('${escapeJsString(endpoint)}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(function(){});
  }, true);
})();
</script>`;

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${script}</body>`);
  }
  return html + script;
}

/**
 * Inject cookie-free analytics tracking into <head> for published sites
 * when analytics_enabled is true.
 */
export function injectTrackingScript(html: string, handle: string): string {
  const script = getTrackingScript(handle);
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${script}</head>`);
  }
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body([^>]*)>/i, `<body$1>${script}`);
  }
  return script + html;
}
