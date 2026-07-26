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
  if (!id || id === "top") return null;
  return `nav_${id}`;
}

function patchNavBlock(blockHtml) {
  return blockHtml.replace(
    /<a\b([^>]*?)>/gi,
    (full, attrs) => {
      if (/\bdata-link-slot\s*=/i.test(attrs)) return full;
      if (/\bclass\s*=\s*["'][^"']*\blogo\b/i.test(attrs)) return full;

      const hrefMatch = attrs.match(/\bhref\s*=\s*["']([^"']*)["']/i);
      const href = hrefMatch?.[1] ?? "";
      const slot = hashToSlot(href);
      if (!slot) return full;

      return `<a data-link-slot="${slot}"${attrs}>`;
    }
  );
}

function patchFile(path) {
  let html = readFileSync(path, "utf8");
  const before = html;

  // Primary nav (v2: nav.primary-nav; v1: ul.nav-links)
  html = html.replace(
    /(<nav\b[^>]*\bprimary-nav\b[^>]*>)([\s\S]*?)(<\/nav>)/gi,
    (_, open, inner, close) => open + patchNavBlock(inner) + close
  );
  html = html.replace(
    /(<ul\b[^>]*\bnav-links\b[^>]*>)([\s\S]*?)(<\/ul>)/gi,
    (_, open, inner, close) => open + patchNavBlock(inner) + close
  );

  // Mobile drawer (v2: mobile-drawer; v1: nav-drawer)
  html = html.replace(
    /(<nav\b[^>]*(?:mobile-drawer|nav-drawer|id=["']mobile-drawer["']|id=["']nav-drawer["'])[^>]*>)([\s\S]*?)(<\/nav>)/gi,
    (_, open, inner, close) => open + patchNavBlock(inner) + close
  );

  // CTA .btn anchors (not submit buttons) — sequential slots
  let ctaIndex = 0;
  html = html.replace(/<a\b([^>]*?)>/gi, (full, attrs) => {
    if (/\bdata-link-slot\s*=/i.test(attrs)) return full;
    if (!/\bclass\s*=\s*["'][^"']*\bbtn\b/i.test(attrs)) return full;
    // Skip powered-by / whatsapp / logo
    if (/\baria-label\s*=\s*["']Chat on WhatsApp["']/i.test(attrs)) return full;
    if (/\bclass\s*=\s*["'][^"']*\blogo\b/i.test(attrs)) return full;

    ctaIndex += 1;
    let slot;
    if (ctaIndex === 1) slot = "cta_primary";
    else if (ctaIndex === 2) slot = "cta_secondary";
    else slot = `cta_${ctaIndex}`;

    return `<a data-link-slot="${slot}"${attrs}>`;
  });

  if (html !== before) {
    writeFileSync(path, html, "utf8");
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
