/**
 * Add data-link-slot attributes to CTA buttons and primary/mobile nav links
 * across templates/ and templates-v2/. Idempotent — skips anchors that
 * already have the attr.
 *
 * Run: node scripts/patch-link-slots.mjs
 * Then re-upload: node --env-file=.env.local scripts/upload-templates.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "fs";
import { join } from "path";

const ROOTS = ["templates-v2", "templates"].map((d) =>
  join(process.cwd(), d)
);

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (name.endsWith(".html")) files.push(p);
  }
  return files;
}

function hashToSlot(href) {
  const m = href.match(/^#([a-zA-Z][\w:-]*)$/);
  if (!m) return null;
  const id = m[1].toLowerCase().replace(/[^a-z0-9]+/g, "_");
  // Skip logo / brand top-of-page anchors
  if (!id || id === "top" || id === "hero") return null;
  return `nav_${id}`;
}

function isSkipNavAnchor(attrs) {
  if (/\bdata-link-slot\s*=/i.test(attrs)) return true;
  if (/\bclass\s*=\s*["'][^"']*\b(logo|nav-logo|nav-brand)\b/i.test(attrs))
    return true;
  if (/\baria-label\s*=\s*["']Chat on WhatsApp["']/i.test(attrs)) return true;
  return false;
}

function patchNavBlock(blockHtml) {
  return blockHtml.replace(/<a\b([^>]*?)>/gi, (full, attrs) => {
    if (isSkipNavAnchor(attrs)) return full;

    const hrefMatch = attrs.match(/\bhref\s*=\s*["']([^"']*)["']/i);
    const href = hrefMatch?.[1] ?? "";
    const slot = hashToSlot(href);
    if (!slot) return full;

    return `<a data-link-slot="${slot}"${attrs}>`;
  });
}

function patchFile(filePath) {
  let html = readFileSync(filePath, "utf8");
  const before = html;

  // Primary nav variants:
  //   v2: <nav class="primary-nav">
  //   v1: <ul class="nav-links">, <nav class="nav-links">, <div class="nav-links">
  html = html.replace(
    /(<nav\b[^>]*\bprimary-nav\b[^>]*>)([\s\S]*?)(<\/nav>)/gi,
    (_, open, inner, close) => open + patchNavBlock(inner) + close
  );
  html = html.replace(
    /(<ul\b[^>]*\bnav-links\b[^>]*>)([\s\S]*?)(<\/ul>)/gi,
    (_, open, inner, close) => open + patchNavBlock(inner) + close
  );
  html = html.replace(
    /(<nav\b[^>]*\bnav-links\b[^>]*>)([\s\S]*?)(<\/nav>)/gi,
    (_, open, inner, close) => open + patchNavBlock(inner) + close
  );
  html = html.replace(
    /(<div\b[^>]*\bnav-links\b[^>]*>)([\s\S]*?)(<\/div>)/gi,
    (_, open, inner, close) => open + patchNavBlock(inner) + close
  );

  // Mobile drawer variants:
  //   v2: mobile-drawer; v1: nav-drawer / drawer / #drawer / #nav-drawer
  html = html.replace(
    /(<nav\b[^>]*(?:mobile-drawer|nav-drawer|\bdrawer\b|id=["']mobile-drawer["']|id=["']nav-drawer["']|id=["']drawer["'])[^>]*>)([\s\S]*?)(<\/nav>)/gi,
    (_, open, inner, close) => open + patchNavBlock(inner) + close
  );

  // CTA anchors: .btn, .hero-cta, .nav-cta (link-style CTAs only)
  let ctaIndex = 0;
  html = html.replace(/<a\b([^>]*?)>/gi, (full, attrs) => {
    if (/\bdata-link-slot\s*=/i.test(attrs)) return full;
    const isCtaClass =
      /\bclass\s*=\s*["'][^"']*\b(btn|hero-cta|nav-cta)\b/i.test(attrs);
    if (!isCtaClass) return full;
    if (/\baria-label\s*=\s*["']Chat on WhatsApp["']/i.test(attrs)) return full;
    if (/\bclass\s*=\s*["'][^"']*\b(logo|nav-logo|nav-brand)\b/i.test(attrs))
      return full;

    ctaIndex += 1;
    let slot;
    if (ctaIndex === 1) slot = "cta_primary";
    else if (ctaIndex === 2) slot = "cta_secondary";
    else slot = `cta_${ctaIndex}`;

    return `<a data-link-slot="${slot}"${attrs}>`;
  });

  if (html !== before) {
    writeFileSync(filePath, html, "utf8");
    return { changed: true, ctas: ctaIndex };
  }
  return { changed: false, ctas: ctaIndex };
}

let changed = 0;
let total = 0;
for (const root of ROOTS) {
  if (!existsSync(root)) {
    console.log("skip missing", root);
    continue;
  }
  const files = walk(root);
  total += files.length;
  for (const f of files) {
    const result = patchFile(f);
    if (result.changed) {
      changed += 1;
      console.log("patched", f.replace(process.cwd(), "").replace(/\\/g, "/"));
    }
  }
}
console.log(`\nDone. ${changed}/${total} files changed.`);
