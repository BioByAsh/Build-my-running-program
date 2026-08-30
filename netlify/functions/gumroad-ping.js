const { getStore } = require('@netlify/blobs');

/**
 * Receives Gumroad's Ping webhook on every sale.
 * Set in Gumroad: Settings -> Advanced -> Ping URL
 * URL: https://myrunningtraining.netlify.app/.netlify/functions/gumroad-ping
 */
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const params = new URLSearchParams(event.body || '');
  const permalink = params.get('product_permalink');
  console.log('Ping received. permalink:', permalink, 'keys:', [...params.keys()].join(','));

  // Accept our product or test pings (test field = true)
  if (permalink !== 'woksrk') {
    console.log('Not our product, ignoring');
    return { statusCode: 200, body: 'OK' };
  }

  // Extract the session_id we attached to the checkout URL
  let sessionId = null;
  const urlParamsRaw = params.get('url_params');
  console.log('url_params raw:', urlParamsRaw);

  if (urlParamsRaw) {
    try {
      // Gumroad may or may not URI-encode url_params — handle both
      let parsed;
      try { parsed = new URLSearchParams(decodeURIComponent(urlParamsRaw)); }
      catch(e) { parsed = new URLSearchParams(urlParamsRaw); }
      sessionId = parsed.get('session_id');
    } catch (e) { console.error('url_params parse error:', e.message); }
  }

  console.log('session_id:', sessionId);

  if (!sessionId) {
    return { statusCode: 200, body: 'OK - no session_id' };
  }

  try {
    // Pass lambda context so Netlify Blobs knows which site/deployment to use
    const store = getStore({ name: 'biopoint-sessions', context });
    await store.setJSON(sessionId, { paid: true, ts: Date.now() });
    console.log('Payment stored for session:', sessionId);
  } catch (e) {
    console.error('Blobs store error:', e.message);
    // Still return 200 so Gumroad does not retry indefinitely
  }

  return { statusCode: 200, body: 'OK' };
};
