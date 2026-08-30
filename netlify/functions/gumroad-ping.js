const { getStore } = require('@netlify/blobs');

/**
 * Receives Gumroad's Ping webhook on every sale.
 * Gumroad sends a POST with form-encoded data.
 * We extract the session_id we embedded in the product URL,
 * and store a payment-confirmed flag so the browser can detect it.
 *
 * Set this URL in Gumroad: Settings -> Advanced -> Ping URL
 * URL: https://your-site.netlify.app/.netlify/functions/gumroad-ping
 */
exports.handler = async (event) => {
  // Must be a POST from Gumroad
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const params = new URLSearchParams(event.body || '');

  // Confirm this is for our product (basic security check)
  const permalink = params.get('product_permalink');
  if (permalink !== 'woksrk') {
    return { statusCode: 200, body: 'OK' }; // Always 200 so Gumroad does not retry
  }

  // Extract the session ID we attached to the Gumroad checkout URL
  let sessionId = null;
  const urlParamsRaw = params.get('url_params');
  if (urlParamsRaw) {
    try {
      const decoded = decodeURIComponent(urlParamsRaw);
      const urlParams = new URLSearchParams(decoded);
      sessionId = urlParams.get('session_id');
    } catch (e) { /* malformed url_params, skip */ }
  }

  if (!sessionId) {
    // Ping arrived but no session ID - nothing to unlock
    return { statusCode: 200, body: 'OK' };
  }

  // Store the confirmation so the browser's polling can pick it up
  const store = getStore('biopoint-sessions');
  await store.setJSON(sessionId, {
    paid: true,
    saleId: params.get('sale_id') || '',
    ts: Date.now(),
  });

  return { statusCode: 200, body: 'OK' };
};
