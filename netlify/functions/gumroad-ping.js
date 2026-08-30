/**
 * Receives Gumroad's Ping webhook on every sale.
 * Stores session → paid in Upstash Redis so the browser can detect it.
 * No npm packages needed - uses Upstash's REST API with fetch.
 */
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const params = new URLSearchParams(event.body || '');
  const permalink = params.get('product_permalink');
  console.log('Ping received. permalink:', permalink);

  if (!permalink || !permalink.includes('woksrk')) {
    return { statusCode: 200, body: 'OK' };
  }

  // Extract the session_id we embedded in the checkout URL
  let sessionId = null;
  const urlParamsRaw = params.get('url_params');
  console.log('url_params:', urlParamsRaw);

  if (urlParamsRaw) {
    try {
      let parsed;
      try { parsed = new URLSearchParams(decodeURIComponent(urlParamsRaw)); }
      catch(e) { parsed = new URLSearchParams(urlParamsRaw); }
      sessionId = parsed.get('session_id');
    } catch(e) { console.error('Parse error:', e.message); }
  }

  console.log('session_id:', sessionId);

  if (!sessionId) {
    return { statusCode: 200, body: 'OK - no session_id' };
  }

  // Store in Upstash Redis via REST API, expires after 1 hour
  try {
    const res = await fetch(
      process.env.UPSTASH_URL + '/set/' + encodeURIComponent(sessionId) + '/paid/ex/3600',
      { headers: { Authorization: 'Bearer ' + process.env.UPSTASH_TOKEN } }
    );
    const result = await res.json();
    console.log('Stored. Upstash response:', JSON.stringify(result));
  } catch(e) {
    console.error('Upstash error:', e.message);
  }

  return { statusCode: 200, body: 'OK' };
};
