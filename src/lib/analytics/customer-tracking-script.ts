/**
 * Returns the inline customer analytics tracking script for published Zuri sites.
 * Injected before </body> by serve-html.ts.
 *
 * Tracks: page_view, whatsapp_click, phone_click, form_submit, cta_click,
 *         product_click, session_start, session_end
 */

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://app.buildzuri.com").replace(/\/$/, "");

export function getCustomerTrackingScript(websiteId: string): string {
  const safeId = websiteId.replace(/[^a-z0-9-]/gi, "").slice(0, 36);

  return `
<script data-zuri-customer-analytics="1">
(function(){
  var WEBSITE_ID = "${safeId}";
  var ENDPOINT = "${APP_URL}/api/track";

  function getOrSet(storage, key) {
    try {
      var v = storage.getItem(key);
      if (!v) { v = crypto.randomUUID(); storage.setItem(key, v); }
      return v;
    } catch (e) { return crypto.randomUUID(); }
  }

  var visitorId = getOrSet(localStorage, 'zuri_customer_vid');
  var sessionId = getOrSet(sessionStorage, 'zuri_customer_sid');
  var isNewVisitor = !localStorage.getItem('zuri_customer_seen');
  if (isNewVisitor) { try { localStorage.setItem('zuri_customer_seen', '1'); } catch(e){} }

  function track(eventType, extra) {
    var payload = Object.assign({
      website_id: WEBSITE_ID,
      event_type: eventType,
      session_id: sessionId,
      visitor_id: visitorId,
      is_new_visitor: isNewVisitor,
      page_path: location.pathname,
      page_title: document.title,
      referrer: document.referrer || null,
      utm_source: new URLSearchParams(location.search).get('utm_source'),
      utm_medium: new URLSearchParams(location.search).get('utm_medium'),
      utm_campaign: new URLSearchParams(location.search).get('utm_campaign'),
      viewport_width: window.innerWidth
    }, extra || {});

    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, JSON.stringify(payload));
    } else {
      fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(payload), keepalive: true }).catch(function(){});
    }
  }

  track('page_view');

  document.addEventListener('click', function(e) {
    var link = e.target.closest('a');
    if (!link) return;
    var href = link.getAttribute('href') || '';
    if (href.indexOf('wa.me') !== -1 || href.indexOf('api.whatsapp.com') !== -1) {
      track('whatsapp_click', { metadata: { label: (link.textContent || '').trim().slice(0, 60) } });
    } else if (href.indexOf('tel:') === 0) {
      track('phone_click');
    } else if (link.hasAttribute('data-zuri-cta')) {
      track('cta_click', { metadata: { label: link.getAttribute('data-zuri-cta') } });
    }
  }, true);

  document.addEventListener('submit', function(e) {
    if (e.target.hasAttribute('data-zuri-track')) {
      track('form_submit', { metadata: { form_id: e.target.id || 'contact' } });
    }
  }, true);

  window.addEventListener('pagehide', function() {
    track('session_end');
  });
})();
</script>`.trim();
}
