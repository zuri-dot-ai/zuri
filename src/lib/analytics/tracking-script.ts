/**
 * Returns the inline tracking script embedded in published Zuri sites.
 * Cookie-free; fires on load and SPA-style route changes.
 *
 * Session 4A v2: gated behind visitor consent (docs/05_ANALYTICS.md
 * addendum). No consent recorded ('zuri_consent' localStorage key = null or
 * 'declined') means no fetch call is made at all, full stop. Mirrors
 * src/lib/analytics/consent.ts — keep the localStorage key/values in sync.
 */
export function getTrackingScript(handle: string): string {
  const rootDomain =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "").replace(
      /\/$/,
      ""
    ) ||
    "buildzuri.com";

  const trackHost = rootDomain.includes("localhost")
    ? rootDomain
    : rootDomain.startsWith("app.")
      ? rootDomain
      : `app.${rootDomain.replace(/^www\./, "")}`;

  const safeHandle = handle.replace(/[^a-z0-9-]/gi, "").slice(0, 30);

  return `
<script data-zuri-analytics="1">
(function(){
  var _zh = '${safeHandle}';
  function _hasConsent() {
    try { return window.localStorage.getItem('zuri_consent') === 'accepted'; }
    catch (e) { return false; }
  }
  function _zt() {
    if (!_hasConsent()) return;
    fetch('https://${trackHost}/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        h: _zh,
        p: window.location.pathname,
        r: document.referrer ? document.referrer.split('?')[0] : '',
        w: window.innerWidth,
      }),
      keepalive: true
    }).catch(function(){});
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _zt);
  } else {
    _zt();
  }
  var _zp = location.pathname;
  setInterval(function() {
    if (location.pathname !== _zp) { _zp = location.pathname; _zt(); }
  }, 500);
  // Consent may be recorded after this script has already run once
  // (banner accept happens post-load) — listen for it and fire immediately.
  window.addEventListener('zuri-consent-changed', function(e) {
    if (e && e.detail === 'accepted') _zt();
  });
})();
</script>`.trim();
}

/**
 * Returns the on-brand consent banner markup + behavior injected into
 * published sites. Mirrors src/components/analytics/ConsentBanner.tsx —
 * published sites are raw HTML with no React hydration, so this is the
 * actual runtime artifact shown to visitors. Shown once per visitor
 * (localStorage 'zuri_consent' unset); Accept/Decline persist the choice and
 * dispatch 'zuri-consent-changed' so the tracking script above can react
 * immediately without a page reload.
 */
export function getConsentBannerScript(): string {
  return `
<div id="zuri-consent-banner" role="banner" aria-label="Cookie-free analytics consent" style="position:fixed;bottom:0;left:0;right:0;z-index:2147483647;display:none;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.75rem;padding:0.75rem 1.25rem;background:#111;color:#f5f5f5;font:500 13px/1.5 system-ui,-apple-system,sans-serif;box-shadow:0 -1px 0 rgba(255,255,255,0.08)">
  <span style="color:rgba(245,245,245,0.85)">We use cookie-free analytics to understand site traffic. No personal data is sold or shared.</span>
  <div style="display:flex;gap:0.5rem;flex-shrink:0">
    <button type="button" id="zuri-consent-decline" style="background:transparent;color:rgba(245,245,245,0.7);border:1px solid rgba(255,255,255,0.16);border-radius:2px;padding:0.4rem 0.85rem;font-weight:500;cursor:pointer">Decline</button>
    <button type="button" id="zuri-consent-accept" style="background:#e8c547;color:#111;border:none;border-radius:2px;padding:0.4rem 0.85rem;font-weight:600;cursor:pointer">Accept</button>
  </div>
</div>
<script data-zuri-consent="1">
(function(){
  var KEY = 'zuri_consent';
  function getChoice() {
    try { return window.localStorage.getItem(KEY); }
    catch (e) { return null; }
  }
  function setChoice(v) {
    try { window.localStorage.setItem(KEY, v); } catch (e) {}
    window.dispatchEvent(new CustomEvent('zuri-consent-changed', { detail: v }));
  }
  function init() {
    if (getChoice() !== null) return;
    var banner = document.getElementById('zuri-consent-banner');
    if (!banner) return;
    banner.style.display = 'flex';
    var accept = document.getElementById('zuri-consent-accept');
    var decline = document.getElementById('zuri-consent-decline');
    if (accept) accept.addEventListener('click', function(){ setChoice('accepted'); banner.style.display = 'none'; });
    if (decline) decline.addEventListener('click', function(){ setChoice('declined'); banner.style.display = 'none'; });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
</script>`.trim();
}
