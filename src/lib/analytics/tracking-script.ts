/**
 * Returns the inline tracking script embedded in published Zuri sites.
 * Cookie-free; fires on load and SPA-style route changes.
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
  function _zt() {
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
})();
</script>`.trim();
}
