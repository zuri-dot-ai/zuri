/**
 * Shared helpers for serving stored template_html (docs/02_WEBSITE_BUILDER.md §7.3–7.4).
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { getCustomerTrackingScript } from "@/lib/analytics/customer-tracking-script";
import { getConsentBannerScript } from "@/lib/analytics/tracking-script";
import {
  getArchetypeFallback,
  isBrokenImageUrl,
} from "@/lib/website/image-url";
import type { DesignArchetype } from "@/types/website";

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
  // FIXED (2026-08): neither preview nor published serving routes set
  // any Cache-Control, so browsers were free to apply their own
  // heuristic caching and serve a stale document after an image swap or
  // regenerate — confirmed via trace: the DB row and generation pipeline
  // were both correct, only the browser's cached HTML response was
  // stale. This route always serves the current DB state fresh
  // (dynamic = "force-dynamic" already enforces that server-side); the
  // browser must never cache it either, since template_html can change
  // at any time via image swap, regenerate, or theme change with no
  // predictable interval.
  "Cache-Control": "no-store, must-revalidate",
} as const;

export function htmlResponse(html: string, status = 200): Response {
  return new Response(html, { status, headers: HTML_HEADERS });
}

export function notFoundResponse(): Response {
  return new Response("Not found", { status: 404 });
}

/**
 * Rewrite broken / picsum / Unsplash / missing-fallback img srcs on
 * data-image-slot elements to a Cloudinary archetype fallback before serving.
 *
 * FIXED: previous version referenced an undeclared `tag` variable inside
 * the loop (only `match` was ever bound from `matches`), which would throw
 * a ReferenceError at runtime the first time this function actually hit a
 * broken image — i.e. this function has likely never successfully run to
 * completion in production. `tag` now correctly refers to the matched
 * <img> string (match[0]).
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
    if (!isBrokenImageUrl(tag)) continue;
    const fixed = tag.includes("src=")
      ? tag.replace(/\bsrc="[^"]*"/i, `src="${fallback}"`)
      : tag.replace(/<img\b/i, `<img src="${fallback}"`);
    out = out.replace(tag, fixed);
  }

  return out;
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
export function injectTrackingScript(html: string, websiteId: string): string {
  const script = getCustomerTrackingScript(websiteId);
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${script}</head>`);
  }
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body([^>]*)>/i, `<body$1>${script}`);
  }
  return script + html;
}

/**
 * Inject the consent banner (docs/05_ANALYTICS.md addendum — Session 4A v2)
 * before </body> for published sites when analytics is enabled. Automatic —
 * no per-site owner configuration required. Must run whenever
 * injectTrackingScript runs so the banner is shown before any tracking call
 * can fire (the tracking script itself also gates on consent as defense in
 * depth, but the banner injection keeps the visible prompt tied 1:1 to sites
 * where tracking is possible at all).
 */
export function injectConsentBanner(html: string): string {
  const banner = getConsentBannerScript();
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${banner}</body>`);
  }
  return html + banner;
}

/**
 * Owner-only studio bridge for /preview — wires image/link slot clicks and
 * highlight-section messages via postMessage. Injected server-side so it works
 * inside a sandboxed iframe without allow-same-origin (parent cannot access
 * contentDocument).
 */
export function injectStudioBridge(html: string): string {
  if (html.includes('data-zuri-studio-bridge="1"')) return html;

  const script = `<script data-zuri-studio-bridge="1">
(function(){
    var SRC='zuri-preview';
    window.addEventListener('message', function(e){
      if(!e.data || e.data.source!==SRC) return;
      if(e.data.type==='highlight-section' && e.data.sectionId){
        var el=document.getElementById(e.data.sectionId);
        if (!el) return;
        el.scrollIntoView({behavior:'smooth',block:'start'});
        el.style.outline='2px solid #C9A84C';
        el.style.outlineOffset='4px';
        setTimeout(function(){ el.style.outline=''; el.style.outlineOffset=''; },1200);
      }
    });
    document.querySelectorAll('img[data-image-slot]').forEach(function(img){
      img.style.cursor='pointer';
      img.addEventListener('click', function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        var slot=img.getAttribute('data-image-slot');
        if(slot) parent.postMessage({source:SRC,type:'image-click',slot:slot}, '*');
      });
    });
    document.querySelectorAll('a[data-link-slot]').forEach(function(a){
      a.style.cursor='pointer';
      a.addEventListener('click', function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        var slot=a.getAttribute('data-link-slot');
        var href=a.getAttribute('href')||'';
        var label=(a.textContent||'').trim();
        if(slot) parent.postMessage({source:SRC,type:'link-click',slot:slot,href:href,label:label}, '*');
      });
    });
  })();
</script>`;

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${script}</body>`);
  }
  return html + script;
}